import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger, UseGuards } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service.js';
import { AuthAdapter, TokenPayload } from '../../common/adapters/auth.adapter.js';
import { BookingStatus, UserRole } from '@prisma/client';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class TrackingGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(TrackingGateway.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly authAdapter: AuthAdapter
  ) {}

  async handleConnection(client: Socket) {
    try {
      const authHeader = client.handshake.headers.authorization || client.handshake.auth?.token;
      if (!authHeader) {
        client.disconnect();
        return;
      }

      const token = authHeader.replace('Bearer ', '');
      const user = this.authAdapter.verifyJwt(token);
      client.data.user = user;

      this.logger.log(`Socket client connected: ${client.id} (User: ${user.phone}, Role: ${user.role})`);
    } catch (err) {
      this.logger.warn(`Unauthorized socket connection attempt: ${err}`);
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Socket client disconnected: ${client.id}`);
  }

  /**
   * Client requests to join a booking-scoped room
   */
  @SubscribeMessage('booking:join')
  async handleJoinBooking(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { bookingId: string }
  ) {
    const user: TokenPayload = client.data.user;
    if (!user || !data.bookingId) {
      return { error: 'Unauthorized or missing bookingId' };
    }

    const booking = await this.prisma.booking.findUnique({
      where: { id: data.bookingId },
      include: {
        customerProfile: true,
        mechanicProfile: true,
      },
    });

    if (!booking) {
      return { error: 'Booking not found' };
    }

    // Authorization: User must be either the customer, the assigned mechanic, or an admin
    const isCustomer = booking.customerProfile.userId === user.userId;
    const isMechanic = booking.mechanicProfile?.userId === user.userId;
    const isAdmin = [UserRole.ADMIN_SUPPORT, UserRole.SUPER_ADMIN].includes(user.role as any);

    if (!isCustomer && !isMechanic && !isAdmin) {
      return { error: 'Forbidden: You are not authorized to view this booking stream' };
    }

    const roomName = `booking:${data.bookingId}`;
    await client.join(roomName);
    this.logger.log(`User ${user.phone} (${user.role}) joined room ${roomName}`);

    return { success: true, room: roomName, currentStatus: booking.status };
  }

  /**
   * Assigned mechanic emits GPS location sample
   */
  @SubscribeMessage('location:update')
  async handleLocationUpdate(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    data: {
      bookingId: string;
      latitude: number;
      longitude: number;
      heading?: number;
      speed?: number;
      accuracyMeters?: number;
    }
  ) {
    const user: TokenPayload = client.data.user;
    if (!user || !user.mechanicProfileId) {
      return { error: 'Only assigned mechanic can stream location' };
    }

    const booking = await this.prisma.booking.findUnique({
      where: { id: data.bookingId },
    });

    if (!booking || booking.mechanicProfileId !== user.mechanicProfileId) {
      return { error: 'Mechanic is not assigned to this booking' };
    }

    // Stop tracking if booking is completed or cancelled
    if (booking.status === BookingStatus.COMPLETED || booking.status === BookingStatus.CANCELLED) {
      return { error: 'Tracking ended for completed/cancelled booking' };
    }

    // Persist location sample
    const sample = await this.prisma.locationSample.create({
      data: {
        bookingId: data.bookingId,
        mechanicProfileId: user.mechanicProfileId,
        latitude: data.latitude,
        longitude: data.longitude,
        heading: data.heading,
        speed: data.speed,
        accuracyMeters: data.accuracyMeters,
      },
    });

    // Broadcast only to authorized room members
    const roomName = `booking:${data.bookingId}`;
    this.server.to(roomName).emit('location:broadcast', {
      bookingId: data.bookingId,
      latitude: data.latitude,
      longitude: data.longitude,
      heading: data.heading,
      speed: data.speed,
      accuracyMeters: data.accuracyMeters,
      recordedAt: sample.recordedAt,
    });

    return { success: true, sampleId: sample.id };
  }

  /**
   * Booking-scoped in-app messaging
   */
  @SubscribeMessage('message:send')
  async handleSendMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    data: {
      bookingId: string;
      content: string;
      imageUrl?: string;
    }
  ) {
    const user: TokenPayload = client.data.user;
    if (!user || !data.content?.trim()) {
      return { error: 'Invalid message' };
    }

    const message = await this.prisma.message.create({
      data: {
        bookingId: data.bookingId,
        senderId: user.userId,
        senderRole: user.role as UserRole,
        content: data.content.trim(),
        imageUrl: data.imageUrl,
      },
    });

    const roomName = `booking:${data.bookingId}`;
    this.server.to(roomName).emit('message:received', message);

    return { success: true, messageId: message.id };
  }
}
