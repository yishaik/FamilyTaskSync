import { Router } from 'express';
import * as taskController from '../controllers/taskController';
import { requireAuth } from '../middleware/auth';

const router = Router();

// Apply auth middleware to all task routes
router.use(requireAuth);

router.get('/', taskController.getTasks);
router.post('/', taskController.createTask);
router.patch('/:id', taskController.updateTask);
router.delete('/:id', taskController.deleteTask);

export default router;