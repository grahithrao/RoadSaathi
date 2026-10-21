import { PrismaClient, DispatchOfferStatus, BookingStatus } from '@prisma/client';
import dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();

console.log('👷 RoadSaathi Durable Worker initialized');

async function sweepExpiredOffers() {
  try {
    const expiredOffers = await prisma.dispatchOffer.findMany({
      where: {
        status: DispatchOfferStatus.PENDING,
        expiresAt: { lt: new Date() },
      },
      include: {
        booking: true,
      },
    });

    for (const offer of expiredOffers) {
      await prisma.dispatchOffer.update({
        where: { id: offer.id },
        data: { status: DispatchOfferStatus.EXPIRED },
      });

      console.log(`⏱️ Expired dispatch offer ${offer.id} for booking ${offer.booking.bookingNumber}`);

      // If no other pending offers exist on the booking, advance to UNFULFILLED
      const remainingOffers = await prisma.dispatchOffer.count({
        where: {
          bookingId: offer.bookingId,
          status: DispatchOfferStatus.PENDING,
        },
      });

      if (remainingOffers === 0 && offer.booking.status === BookingStatus.OFFERED) {
        await prisma.booking.update({
          where: { id: offer.bookingId },
          data: { status: BookingStatus.UNFULFILLED },
        });
        console.log(`❌ Booking ${offer.booking.bookingNumber} marked UNFULFILLED (all offers expired)`);
      }
    }
  } catch (err) {
    console.error('Error during offer sweep:', err);
  }
}

async function sweepPendingNotifications() {
  try {
    const pendingJobs = await prisma.notificationJob.findMany({
      where: { status: 'PENDING' },
      take: 10,
    });

    for (const job of pendingJobs) {
      // Simulate/perform delivery
      await prisma.notificationJob.update({
        where: { id: job.id },
        data: {
          status: 'SENT',
          sentAt: new Date(),
        },
      });
      console.log(`📨 Delivered pending notification ${job.id} to ${job.recipientPhone || job.recipientEmail}`);
    }
  } catch (err) {
    console.error('Error during notification sweep:', err);
  }
}

// Durable interval sweeps
const offerInterval = setInterval(sweepExpiredOffers, 5000);
const notifInterval = setInterval(sweepPendingNotifications, 10000);

// Initial run
sweepExpiredOffers();
sweepPendingNotifications();

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('🛑 Worker received SIGTERM, shutting down...');
  clearInterval(offerInterval);
  clearInterval(notifInterval);
  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('🛑 Worker received SIGINT, shutting down...');
  clearInterval(offerInterval);
  clearInterval(notifInterval);
  await prisma.$disconnect();
  process.exit(0);
});
