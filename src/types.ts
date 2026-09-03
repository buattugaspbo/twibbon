export type PostStatus = 'pending' | 'approved' | 'rejected';

export interface TwibbonPost {
  id: string;
  nim: string;
  ig_url: string;
  screenshot_path: string;
  status: PostStatus;
  reject_reason: string | null;
  created_at: string;
  approved_at: string | null;
}

export interface TwibbonFile {
  id: string;
  title: string;
  storage_path: string;
  file_kind: 'frame' | 'video';
  sort_order: number;
  created_at: string;
}

export interface TwibbonTerms {
  id: number;
  body_md: string;
  updated_at: string;
}

export type SettingsValue = string | number | boolean | null;
export interface TwibbonSetting {
  key: string;
  value: SettingsValue;
  updated_at: string;
}

export interface SettingsMap {
  event_title: string;
  event_subtitle: string;
  target_count: number;
  video_url: string;
  deadline_at: string | null;
  deadline_label: string;
}

export interface TwibbonMember {
  id: string;
  position: number | null;
  group_number: number | null;
  nim: string | null;
  name: string;
  metadata: Record<string, unknown>;
  created_at: string;
  created_by: string;
  updated_at: string;
  updated_by: string | null;
}

export interface TwibbonMemberHistory {
  id: string;
  member_id: string | null;
  member_nim: string | null;
  member_name: string | null;
  action: 'created' | 'updated' | 'deleted';
  old_data: Partial<TwibbonMember> | null;
  new_data: Partial<TwibbonMember> | null;
  changed_by: string;
  changed_by_kind: 'admin' | 'system';
  note: string | null;
  changed_at: string;
}

export interface Identity {
  name: string;
  nim: string;
}