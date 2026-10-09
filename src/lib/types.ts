export type UserRole = 'student' | 'alumni' | 'admin';

export type AlumniStatus = 'pending' | 'approved' | 'rejected' | null;

export interface Profile {
  id: string;
  full_name: string;
  email: string;
  role: UserRole;
  avatar_url: string | null;
  bio: string | null;
  department: string | null;
  graduation_year: number | null;
  alumni_verified: boolean;
  alumni_status: AlumniStatus;
  company: string | null;
  job_title: string | null;
  location: string | null;
  linkedin_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface Conversation {
  id: string;
  is_group: boolean;
  created_at: string;
  last_message_at: string;
}

export interface ConversationParticipant {
  id: string;
  conversation_id: string;
  user_id: string;
  joined_at: string;
}

export type GroupType = 'course' | 'club' | 'hostel' | 'general';

export interface Group {
  id: string;
  name: string;
  description: string | null;
  group_type: GroupType;
  invite_code: string;
  is_announcement: boolean;
  created_by: string;
  created_at: string;
  last_message_at: string;
}

export interface GroupMember {
  id: string;
  group_id: string;
  user_id: string;
  role: 'admin' | 'member';
  joined_at: string;
}

export interface Message {
  id: string;
  conversation_id: string | null;
  group_id: string | null;
  sender_id: string;
  content: string;
  created_at: string;
  deleted_at: string | null;
}

export interface MessageRead {
  id: string;
  conversation_id: string;
  user_id: string;
  last_read_at: string;
}

export interface ConversationWithMeta extends Conversation {
  other_user: Profile | null;
  last_message: Message | null;
  unread_count: number;
}

export interface GroupWithMeta extends Group {
  member_count: number;
  last_message: Message | null;
  my_role: 'admin' | 'member' | null;
  is_member: boolean;
}

export interface Post {
  id: string;
  author_id: string;
  content: string;
  created_at: string;
  deleted_at: string | null;
  hidden: boolean;
}

export interface PostImage {
  id: string;
  post_id: string;
  image_url: string;
  position: number;
  created_at: string;
}

export interface PostLike {
  id: string;
  post_id: string;
  user_id: string;
  created_at: string;
}

export interface Comment {
  id: string;
  post_id: string;
  author_id: string;
  content: string;
  parent_id: string | null;
  created_at: string;
  deleted_at: string | null;
}

export interface PostWithMeta extends Post {
  author: Profile | null;
  images: PostImage[];
  like_count: number;
  liked_by_me: boolean;
  comment_count: number;
}

export interface CommentWithMeta extends Comment {
  author: Profile | null;
  replies: CommentWithMeta[];
}

export type ConnectionStatus = 'pending' | 'accepted' | 'rejected' | 'blocked';

export interface Connection {
  id: string;
  requester_id: string;
  target_id: string;
  status: ConnectionStatus;
  message: string | null;
  created_at: string;
  responded_at: string | null;
}

export type NotificationType =
  | 'connection_request'
  | 'connection_accepted'
  | 'connection_rejected'
  | 'post_like'
  | 'post_comment'
  | 'comment_reply'
  | 'admin_verified'
  | 'admin_rejected'
  | 'group_invite';

export interface Notification {
  id: string;
  user_id: string;
  actor_id: string;
  type: NotificationType;
  entity_id: string | null;
  entity_type: string | null;
  content: string | null;
  read: boolean;
  created_at: string;
}

export interface NotificationWithMeta extends Notification {
  actor: Profile | null;
}

export type EventCategory = 'academic' | 'social' | 'sports' | 'workshop' | 'career' | 'other';

export interface Event {
  id: string;
  title: string;
  description: string | null;
  category: EventCategory;
  location: string | null;
  event_date: string;
  start_time: string;
  end_time: string | null;
  cover_image_url: string | null;
  capacity: number | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export type RsvpStatus = 'going' | 'interested' | 'not_going';

export interface Rsvp {
  id: string;
  event_id: string;
  user_id: string;
  status: RsvpStatus;
  created_at: string;
  updated_at: string;
}

export interface EventWithMeta extends Event {
  creator: Profile | null;
  rsvp_counts: { going: number; interested: number; not_going: number };
  my_rsvp: RsvpStatus | null;
  is_creator: boolean;
}
