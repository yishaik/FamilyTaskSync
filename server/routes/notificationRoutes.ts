import { Router } from 'express';
import * as notificationController from '../controllers/notificationController';
import { requireAuth } from '../middleware/auth';

const router = Router();

// Apply auth middleware to all notification routes except webhook
router.get('/log', requireAuth, notificationController.getNotificationLogs);
router.get('/:userId', requireAuth, notificationController.getNotificationsByUserId);
router.post('/', requireAuth, notificationController.createNotification);
router.post('/:id/read', requireAuth, notificationController.markNotificationAsRead);
router.post('/test/:userId', requireAuth, notificationController.testNotification);

// Webhook doesn't need auth - it's called by Twilio
router.post('/webhook', notificationController.handleWebhook);

export default router;