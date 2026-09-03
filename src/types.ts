export interface TwibbonTask {
  id: string;
  task_key: string;
  task_title: string;
  task_order: number;
  requirements_md: string | null;
  materials: TaskMaterial[];
  deadline_at: string | null;
  deadline_label: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface TaskMaterial {
  type: 'link' | 'file';
  title: string;
  url?: string;
  storage_path?: string;
}

export interface TwibbonTaskSubmission {
  id: string;
  task_key: string;
  name: string;
  nim: string;
  submission_data: Record<string, unknown>;
  status: 'pending' | 'approved' | 'rejected';
  notes: string | null;
  submitted_at: string;
  reviewed_at: string | null;
  reviewed_by: string | null;
}

// Legacy types (akan di-deprecate setelah migration selesai)
export interface TwibbonPost {
  id: string;
  nim: string;
  name?: string; // Tambahan untuk tampil di gallery
  ig_url: string;
  screenshot_path: string;
  status: 'pending' | 'approved' | 'rejected';
  notes: string | null;
  reject_reason?: string; // Alasan reject dari admin
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

export interface TwibbonMember {
  id: string;
  group_number: number | null;
  position: number | null;
  nim: string | null;
  name: string;
  created_at: string;
  updated_at: string;
  created_by: string;
  updated_by: string;
}

export interface TwibbonMemberHistory {
  id: string;
  member_id: string;
  member_nim: string | null;
  member_name: string;
  action: 'created' | 'updated' | 'deleted';
  old_data: Record<string, unknown> | null;
  new_data: Record<string, unknown> | null;
  changed_by: string;
  changed_by_kind: 'admin' | 'system' | 'user';
  note: string | null;
  changed_at: string;
}

export interface SettingsMap {
  event_title?: string;
  event_subtitle?: string;
  target_count?: number;
  video_url?: string;
  deadline_at?: string;
  deadline_label?: string;
  deadline_video_at?: string;
  deadline_video_label?: string;
  video_requirements_md?: string;
  grup_link?: string;
}

export interface Identity {
  name: string;
  nim: string;
}