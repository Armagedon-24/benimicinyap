// Plain TypeScript interfaces matching Prisma models

export interface User {
  id: string;
  email: string;
  password: string;
  fullName: string;
  city: string;
  bio: string;
  tcNo: string;
  tcVerified: boolean;
  paymentVerified: boolean;
  role: "user" | "admin";
  walletBalance: number;
  escrowBalance: number;
  rating: number;
  totalReviews: number;
  completedTasksCount: number;
  isOnline: boolean;
  darkMode: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  city: string;
  district: string;
  category: string;
  fee: number;
  dueDate: string;
  status: "pending" | "assigned" | "in_progress" | "completed" | "cancelled" | "delivered" | "disputed";
  latitude: number;
  longitude: number;
  requesterId: string;
  assignedToId: string | null;
  assignedToName: string | null;
  evidencePhoto?: string;
  evidenceDescription?: string;
  evidenceLocation?: string;
  disputeReason?: string;
  disputeResult?: string;
  disputedAt?: string;
  aiCheckVerdict?: string; // human | ai_suspected | unclear
  aiCheckScore?: number;
  aiCheckReason?: string;
  aiCheckSignals?: string;
  aiCheckedAt?: string;
  createdAt: string;
  updatedAt: string;
  // Joined fields
  requester?: Pick<User, "id" | "fullName" | "city" | "rating">;
  assignee?: User;
  bids?: Bid[];
  messages?: Message[];
  transactions?: Transaction[];
}

export interface Bid {
  id: string;
  taskId: string;
  taskerId: string;
  taskerName: string;
  taskerRating: number;
  amount: number;
  proposalText: string;
  status: "pending" | "accepted" | "rejected";
  createdAt: string;
  // Joined fields
  task?: Task;
  tasker?: Pick<User, "id" | "fullName" | "city" | "rating">;
}

export interface Transaction {
  id: string;
  userId: string;
  taskId: string | null;
  taskTitle: string;
  amount: number;
  platformFee: number;
  type:
    | "escrow_block"
    | "escrow_release"
    | "wallet_load"
    | "wallet_withdraw"
    | "admin_adjust"
    | "platform_commission";
  status: "pending" | "completed" | "failed";
  createdAt: string;
  // Joined fields
  user?: User;
  task?: Task;
}

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: "info" | "success" | "warning" | "error";
  read: boolean;
  createdAt: string;
  // Joined fields
  user?: User;
}

export interface Message {
  id: string;
  taskId: string;
  senderId: string;
  senderName: string;
  content: string;
  receiverId: string;
  createdAt: string;
  isNegotiation?: boolean;
  negotiationPrice?: number;
  negotiationStatus?: "pending" | "accepted" | "rejected";
  // Joined fields
  task?: Task;
  sender?: User;
  receiver?: User;
}

export interface PaymentCard {
  id: string;
  userId: string;
  bankName: string;
  cardNumber: string;
  cardHolder: string;
  createdAt: string;
  // Joined fields
  user?: User;
}

export interface SystemLog {
  id: string;
  level: string;
  message: string;
  createdAt: string;
}

export interface Review {
  id: string;
  taskId: string;
  taskTitle: string;
  fromUserId: string;
  fromUserName: string;
  toUserId: string;
  toUserName: string;
  rating: number; // 1-5
  comment: string;
  fromRole: 'requester' | 'tasker'; // who is giving the review
  createdAt: string;
  // Joined fields
  fromUser?: Pick<User, 'id' | 'fullName' | 'city' | 'rating'>;
  toUser?: Pick<User, 'id' | 'fullName' | 'city' | 'rating'>;
  task?: Task;
}

export interface PlatformSetting {
  id: string;
  key: string;
  value: string;
  label: string;
  type: "string" | "number" | "boolean";
  group: "commission" | "listing" | "withdraw" | "general";
  createdAt: string;
  updatedAt: string;
}