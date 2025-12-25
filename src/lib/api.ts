import { supabase } from './supabase'

// ============================================================================
// USER FUNCTIONS
// ============================================================================

export interface AvatarConfig {
  face: string
  hat: string
  top: string
  bottom: string
  outfit: string
  misc: string
}

export const DEFAULT_AVATAR_CONFIG: AvatarConfig = {
  face: 'none',
  hat: 'none',
  top: 'none',
  bottom: 'none',
  outfit: 'none',
  misc: 'none',
}

export interface User {
  id: string
  name: string | null
  email: string | null
  avatar_url: string | null
  avatar_config: AvatarConfig
  total_xp: number
  current_streak: number
  longest_streak: number
  last_read_date: string | null
  current_tier: string
}

export async function getCurrentUser(): Promise<User | null> {
  const { data, error } = await supabase.rpc('get_current_user')
  if (error) throw error
  if (!data?.[0]) return null
  const user = data[0] as unknown as User
  return {
    ...user,
    avatar_config: user.avatar_config ?? DEFAULT_AVATAR_CONFIG
  }
}

export async function updateAvatarConfig(config: AvatarConfig): Promise<AvatarConfig> {
  const { data, error } = await supabase.rpc('update_avatar_config' as 'get_current_user', {
    p_config: config
  } as unknown as Record<string, never>)
  if (error) throw error
  return data as unknown as AvatarConfig
}

// ============================================================================
// CHAPTER FUNCTIONS
// ============================================================================

export interface AchievementUnlock {
  id: string
  key: string
  name: string
  description: string
  icon: string
  xp_reward: number
}

export interface CompleteChapterResult {
  success: boolean
  already_completed: boolean
  xp_awarded: number
  achievement?: {
    awarded: boolean
    reason?: string
    achievement?: AchievementUnlock
  }
}

export async function completeChapter(book: string, chapter: number): Promise<CompleteChapterResult> {
  const { data, error } = await supabase.rpc('complete_chapter', {
    p_book: book,
    p_chapter: chapter
  })
  if (error) throw error
  return data as CompleteChapterResult
}

export async function getCompletedChaptersForBook(book: string): Promise<number[]> {
  const { data, error } = await supabase.rpc('get_completed_chapters_for_book', {
    p_book: book
  })
  if (error) throw error
  return data ?? []
}

export interface BookProgress {
  completed: number
  total: number
  percentage: number
  is_complete: boolean
}

export async function getBookProgress(book: string, totalChapters: number): Promise<BookProgress> {
  const { data, error } = await supabase.rpc('get_book_progress', {
    p_book: book,
    p_total_chapters: totalChapters
  })
  if (error) throw error
  return data as BookProgress
}

export async function getCompletedChapters(): Promise<{
  id: string
  book: string
  chapter: number
  completed_at: string
  xp_awarded: number
}[]> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data, error } = await supabase
    .from('chapter_completions')
    .select('id, book, chapter, completed_at, xp_awarded')
    .eq('user_id', user.id)
    .order('completed_at', { ascending: false })

  if (error) throw error
  return data ?? []
}

export async function isChapterCompleted(book: string, chapter: number): Promise<boolean> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return false

  const { data, error } = await supabase
    .from('chapter_completions')
    .select('id')
    .eq('user_id', user.id)
    .eq('book', book)
    .eq('chapter', chapter)
    .maybeSingle()

  if (error) throw error
  return data !== null
}

export async function getRecentCompletions(limit = 10): Promise<{
  book: string
  chapter: number
  completed_at: string
}[]> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data, error } = await supabase
    .from('chapter_completions')
    .select('book, chapter, completed_at')
    .eq('user_id', user.id)
    .order('completed_at', { ascending: false })
    .limit(limit)

  if (error) throw error
  return data ?? []
}

// ============================================================================
// PROGRESS / STREAK FUNCTIONS
// ============================================================================

export interface VerseReadResult {
  xp_awarded: number
  total_xp: number
  current_streak: number
  streak_updated: boolean
  streak_achievements?: {
    checked_streak: number
    newly_awarded: AchievementUnlock[]
  } | null
}

export async function recordVerseRead(): Promise<VerseReadResult> {
  const { data, error } = await supabase.rpc('record_verse_read')
  if (error) throw error
  return data as VerseReadResult
}

export interface QuizAnswerResult {
  xp_awarded: number
  total_xp: number
}

export async function recordQuizAnswer(correct: boolean, book: string, chapter: number): Promise<QuizAnswerResult> {
  const { data, error } = await supabase.rpc('record_quiz_answer', {
    p_correct: correct,
    p_book: book,
    p_chapter: chapter
  })
  if (error) throw error
  return data as QuizAnswerResult
}

export interface ProgressSummary {
  total_xp: number
  current_streak: number
  longest_streak: number
  current_tier: string | null
  last_read_date: string | null
}

export async function getProgressSummary(): Promise<ProgressSummary | null> {
  const { data, error } = await supabase.rpc('get_progress_summary')
  if (error) throw error
  return data as ProgressSummary | null
}

export interface OverallProgress {
  total_chapters_completed: number
  books_started: number
  books_completed: number
}

export async function getOverallProgress(): Promise<OverallProgress> {
  const { data, error } = await supabase.rpc('get_overall_progress')
  if (error) throw error
  return (data as OverallProgress) ?? { total_chapters_completed: 0, books_started: 0, books_completed: 0 }
}

// ============================================================================
// TIER FUNCTIONS
// ============================================================================

export interface UserTier {
  tier: string
  color: string
  rolling_xp: number
  next_tier: string | null
  xp_to_next_tier: number | null
}

export async function getCurrentUserTier(): Promise<UserTier | null> {
  const { data, error } = await supabase.rpc('get_current_user_tier')
  if (error) throw error
  return data as UserTier | null
}

export interface TierThreshold {
  tier: string
  min_xp: number
  tier_order: number
  color: string
}

export async function getTierThresholds(): Promise<TierThreshold[]> {
  const { data, error } = await supabase
    .from('tier_thresholds')
    .select('tier, min_xp, tier_order, color')
    .order('tier_order')

  if (error) throw error
  return data ?? []
}

export interface RollingXpDay {
  date: string
  xp: number
}

export async function getRollingXpHistory(days = 14): Promise<RollingXpDay[]> {
  const { data, error } = await supabase.rpc('get_rolling_xp_history', {
    p_days: days
  })
  if (error) throw error
  return data ?? []
}

export interface LeaderboardEntry {
  user_id: string
  name: string | null
  avatar_url: string | null
  avatar_config: AvatarConfig
  rolling_xp: number
  tier: string
  tier_color: string
  rank: number
  is_current_user: boolean
}

export async function getGlobalLeaderboard(limit = 50): Promise<LeaderboardEntry[]> {
  const { data, error } = await supabase.rpc('get_global_leaderboard', {
    p_limit: limit
  })
  if (error) throw error
  return ((data ?? []) as unknown as LeaderboardEntry[]).map((entry) => ({
    ...entry,
    avatar_config: entry.avatar_config ?? DEFAULT_AVATAR_CONFIG
  }))
}

export interface UserRank {
  rank: number
  total_users: number
  percentile: number
}

export async function getUserRank(): Promise<UserRank | null> {
  const leaderboard = await getGlobalLeaderboard(1000)
  const currentUser = leaderboard.find(e => e.is_current_user)
  if (!currentUser) return null

  return {
    rank: currentUser.rank,
    total_users: leaderboard.length,
    percentile: Math.round(((leaderboard.length - currentUser.rank + 1) / leaderboard.length) * 100)
  }
}

// ============================================================================
// GROUP FUNCTIONS
// ============================================================================

export interface Group {
  id: string
  name: string
  description: string | null
  leader_id: string
  created_at: string
  is_leader: boolean
  member_count: number
}

export async function listMyGroups(): Promise<Group[]> {
  const { data, error } = await supabase.rpc('list_my_groups')
  if (error) throw error
  return data ?? []
}

export interface GroupDetail {
  id: string
  name: string
  description: string | null
  leader_id: string
  created_at: string
  invite_code: string | null
  leader_name: string | null
  is_leader: boolean
  is_member: boolean
  open_for_challenges: boolean
  members_can_invite: boolean
}

export async function getGroup(groupId: string): Promise<GroupDetail | null> {
  const { data, error } = await supabase.rpc('get_group', {
    p_group_id: groupId
  })
  if (error) throw error
  return data as GroupDetail | null
}

export interface GroupLeaderboardMember {
  user_id: string
  name: string | null
  avatar_url: string | null
  avatar_config: AvatarConfig
  total_xp: number
  current_streak: number
  rank: number
  is_leader: boolean
  is_current_user: boolean
}

export async function getGroupLeaderboard(groupId: string): Promise<GroupLeaderboardMember[]> {
  const { data, error } = await supabase.rpc('get_group_leaderboard', {
    p_group_id: groupId
  })
  if (error) throw error
  return ((data ?? []) as unknown as GroupLeaderboardMember[]).map((member) => ({
    ...member,
    avatar_config: member.avatar_config ?? DEFAULT_AVATAR_CONFIG
  }))
}

export async function createGroup(name: string, description?: string): Promise<string> {
  const { data, error } = await supabase.rpc('create_group', {
    p_name: name,
    p_description: description
  })
  if (error) throw error
  return data as string
}

export interface InviteResult {
  success: boolean
  message: string
}

export async function inviteToGroup(groupId: string, identifier: string): Promise<InviteResult> {
  const { data, error } = await supabase.rpc('invite_to_group', {
    p_group_id: groupId,
    p_identifier: identifier
  })
  if (error) throw error
  return data as InviteResult
}

export async function respondToInvite(inviteId: string, accept: boolean): Promise<void> {
  const { error } = await supabase.rpc('respond_to_invite', {
    p_invite_id: inviteId,
    p_accept: accept
  })
  if (error) throw error
}

export interface PendingInvite {
  id: string
  group_id: string
  group_name: string
  invited_by_name: string | null
  created_at: string
}

export async function getPendingInvites(): Promise<PendingInvite[]> {
  const { data, error } = await supabase.rpc('get_pending_invites')
  if (error) throw error
  return data ?? []
}

export async function leaveGroup(groupId: string): Promise<void> {
  const { error } = await supabase.rpc('leave_group', {
    p_group_id: groupId
  })
  if (error) throw error
}

export async function transferLeadership(groupId: string, newLeaderId: string): Promise<void> {
  const { error } = await supabase.rpc('transfer_leadership', {
    p_group_id: groupId,
    p_new_leader_id: newLeaderId
  })
  if (error) throw error
}

export async function deleteGroup(groupId: string): Promise<void> {
  const { error } = await supabase.rpc('delete_group', {
    p_group_id: groupId
  })
  if (error) throw error
}

export async function removeMember(groupId: string, memberId: string): Promise<void> {
  const { error } = await supabase.rpc('remove_member', {
    p_group_id: groupId,
    p_member_id: memberId
  })
  if (error) throw error
}

export async function cancelInvite(inviteId: string): Promise<void> {
  const { error } = await supabase.rpc('cancel_invite', {
    p_invite_id: inviteId
  })
  if (error) throw error
}

export interface GroupPendingInvite {
  id: string
  invited_user_name: string | null
  invited_user_email: string | null
  created_at: string
}

export async function getGroupPendingInvites(groupId: string): Promise<GroupPendingInvite[]> {
  const { data, error } = await supabase.rpc('get_group_pending_invites', {
    p_group_id: groupId
  })
  if (error) throw error
  return data ?? []
}

export interface UpdateGroupResult {
  success: boolean
  message: string
}

export async function updateGroup(groupId: string, name: string, description?: string): Promise<UpdateGroupResult> {
  const { data, error } = await supabase.rpc('update_group', {
    p_group_id: groupId,
    p_name: name,
    p_description: description
  })
  if (error) throw error
  return data as unknown as UpdateGroupResult
}

export interface RegenerateInviteCodeResult {
  success: boolean
  message?: string
  invite_code?: string
}

export async function regenerateInviteCode(groupId: string): Promise<RegenerateInviteCodeResult> {
  const { data, error } = await supabase.rpc('regenerate_invite_code', {
    p_group_id: groupId
  })
  if (error) throw error
  return data as unknown as RegenerateInviteCodeResult
}

export interface JoinGroupByCodeResult {
  success: boolean
  message: string
  group_id?: string
  group_name?: string
}

export async function joinGroupByCode(inviteCode: string): Promise<JoinGroupByCodeResult> {
  const { data, error } = await supabase.rpc('join_group_by_code', {
    p_invite_code: inviteCode
  })
  if (error) throw error
  return data as unknown as JoinGroupByCodeResult
}

export interface GroupActivity {
  activity_id: string
  user_id: string
  user_name: string | null
  user_avatar_url: string | null
  user_avatar_config: AvatarConfig
  activity_type: string
  metadata: Record<string, unknown>
  created_at: string
}

export async function getGroupActivityFeed(groupId: string, limit = 50): Promise<GroupActivity[]> {
  const { data, error } = await supabase.rpc('get_group_activity_feed', {
    p_group_id: groupId,
    p_limit: limit
  })
  if (error) throw error
  return ((data ?? []) as unknown as GroupActivity[]).map(activity => ({
    ...activity,
    user_avatar_config: activity.user_avatar_config ?? DEFAULT_AVATAR_CONFIG
  }))
}

export interface GroupStatistics {
  member_count: number
  total_xp: number
  total_chapters: number
  xp_this_week: number
  active_members: number
}

export async function getGroupStatistics(groupId: string): Promise<GroupStatistics | null> {
  const { data, error } = await supabase.rpc('get_group_statistics', {
    p_group_id: groupId
  })
  if (error) throw error
  return data as unknown as GroupStatistics | null
}

// ============================================================================
// GROUP LEVEL FUNCTIONS
// ============================================================================

export interface GroupLevelInfo {
  group_id: string
  current_level: string
  level_color: string
  weekly_xp: number
  xp_to_next_level: number | null
  next_level: string | null
  next_level_threshold: number | null
  week_start: string
}

export async function getGroupLevelInfo(groupId: string): Promise<GroupLevelInfo | null> {
  const { data, error } = await supabase.rpc('get_group_level_info', {
    p_group_id: groupId
  })
  if (error) throw error
  return data as GroupLevelInfo | null
}

export interface GroupLevelThreshold {
  level: string
  min_weekly_xp: number
  level_order: number
  color: string
}

export async function getGroupLevelThresholds(): Promise<GroupLevelThreshold[]> {
  const { data, error } = await supabase.rpc('get_group_level_thresholds')
  if (error) throw error
  return data ?? []
}

// ============================================================================
// PROFILE STATS FUNCTIONS
// ============================================================================

export interface ProfileStats {
  total_xp: number
  rolling_xp: number
  current_streak: number
  longest_streak: number
  current_tier: string
  tier_color: string
  next_tier: string | null
  xp_to_next_tier: number | null
  next_tier_threshold: number | null
  books_started: number
  chapters_completed: number
  achievements_unlocked: number
  achievements_total: number
}

export async function getProfileStats(): Promise<ProfileStats | null> {
  const { data, error } = await supabase.rpc('get_profile_stats')
  if (error) throw error
  return data as ProfileStats | null
}

// ============================================================================
// ACHIEVEMENT FUNCTIONS
// ============================================================================

export interface Achievement {
  id: string
  key: string
  name: string
  description: string
  icon: string
  category: string
  xp_reward: number
  unlocked: boolean
  unlocked_at: string | null
}

export async function getAllAchievements(): Promise<Achievement[]> {
  const { data, error } = await supabase
    .from('achievements')
    .select('id, key, name, description, icon, category, xp_reward')

  if (error) throw error
  return (data ?? []).map(a => ({ ...a, unlocked: false, unlocked_at: null }))
}

export async function getAchievementsWithStatus(): Promise<Achievement[]> {
  const { data, error } = await supabase.rpc('get_achievements_with_status')
  if (error) throw error
  return data ?? []
}

export async function getUserAchievements(): Promise<Achievement[]> {
  const achievements = await getAchievementsWithStatus()
  return achievements.filter(a => a.unlocked)
}

export interface AchievementStats {
  unlocked: number
  total: number
  percentage: number
}

export async function getAchievementStats(): Promise<AchievementStats> {
  const { data, error } = await supabase.rpc('get_achievement_stats')
  if (error) throw error
  return (data as AchievementStats) ?? { unlocked: 0, total: 0, percentage: 0 }
}

// ============================================================================
// BOOK ACHIEVEMENT FUNCTIONS
// ============================================================================

export interface BookAchievementProgress {
  book: string
  completed_chapters: number
  total_chapters: number
  percentage: number
  is_complete: boolean
  achievement_key: string
  achievement_name: string
  achievement_unlocked: boolean
}

export async function getAllBookProgress(): Promise<BookAchievementProgress[]> {
  const { data, error } = await supabase.rpc('get_all_book_progress')
  if (error) throw error
  return data ?? []
}

export interface CheckAllBooksResult {
  checked: number
  newly_awarded: Array<{
    awarded: boolean
    achievement: AchievementUnlock
  }>
}

export async function checkAllBookAchievements(): Promise<CheckAllBooksResult> {
  const { data, error } = await supabase.rpc('check_all_book_achievements')
  if (error) throw error
  return data as CheckAllBooksResult
}

export async function getBookAchievements(): Promise<Achievement[]> {
  const achievements = await getAchievementsWithStatus()
  return achievements.filter(a => a.category === 'book_completion')
}

export async function getStreakAchievements(): Promise<Achievement[]> {
  const achievements = await getAchievementsWithStatus()
  return achievements.filter(a => a.category === 'streak')
}

export async function getChallengeAchievements(): Promise<Achievement[]> {
  const achievements = await getAchievementsWithStatus()
  return achievements.filter(a => a.category === 'special' && a.key.startsWith('challenge_wins'))
}

export interface CheckMiscAchievementsResult {
  streak: {
    checked_streak: number
    newly_awarded: AchievementUnlock[]
  }
  challenges: {
    total_wins: number
    newly_awarded: AchievementUnlock[]
  }
}

export async function checkAllMiscAchievements(): Promise<CheckMiscAchievementsResult> {
  const { data, error } = await supabase.rpc('check_all_misc_achievements')
  if (error) throw error
  return data as CheckMiscAchievementsResult
}

// ============================================================================
// CHALLENGE FUNCTIONS
// ============================================================================

export type ChallengeStatus = 'pending' | 'active' | 'completed' | 'declined' | 'cancelled'

export interface Challenge {
  challenge_id: string
  challenger_group_id: string
  challenger_group_name: string
  challenged_group_id: string
  challenged_group_name: string
  challenge_status: ChallengeStatus
  created_at: string
  start_time: string | null
  end_time: string | null
  challenger_member_count: number
  challenged_member_count: number
  challenger_xp_earned: number
  challenged_xp_earned: number
  challenger_score: number  // per-capita XP
  challenged_score: number  // per-capita XP
  winner_group_id: string | null
  is_challenger: boolean
  is_challenged: boolean
  can_respond: boolean
  can_cancel: boolean
}

export interface CreateChallengeResult {
  success: boolean
  message: string
  challenge_id?: string
}

export async function createChallenge(challengerGroupId: string, challengedGroupId: string): Promise<CreateChallengeResult> {
  const { data, error } = await supabase.rpc('create_challenge', {
    p_challenger_group_id: challengerGroupId,
    p_challenged_group_id: challengedGroupId
  })
  if (error) throw error
  return data as CreateChallengeResult
}

export interface RespondToChallengeResult {
  success: boolean
  message: string
}

export async function respondToChallenge(challengeId: string, accept: boolean): Promise<RespondToChallengeResult> {
  const { data, error } = await supabase.rpc('respond_to_challenge', {
    p_challenge_id: challengeId,
    p_accept: accept
  })
  if (error) throw error
  return data as RespondToChallengeResult
}

export async function cancelChallenge(challengeId: string): Promise<{ success: boolean; message: string }> {
  const { data, error } = await supabase.rpc('cancel_challenge', {
    p_challenge_id: challengeId
  })
  if (error) throw error
  return data as { success: boolean; message: string }
}

export async function getGroupChallenges(groupId: string): Promise<Challenge[]> {
  const { data, error } = await supabase.rpc('get_group_challenges', {
    p_group_id: groupId
  })
  if (error) throw error
  return (data ?? []) as Challenge[]
}

export interface GroupLookupResult {
  found: boolean
  id?: string
  name?: string
}

export async function lookupGroupForChallenge(groupId: string): Promise<GroupLookupResult> {
  const { data, error } = await supabase.rpc('lookup_group_for_challenge', {
    p_group_id: groupId
  })
  if (error) throw error
  return data as GroupLookupResult
}

export interface ToggleOpenForChallengesResult {
  success: boolean
  message: string
  open_for_challenges?: boolean
}

export async function toggleOpenForChallenges(groupId: string, open: boolean): Promise<ToggleOpenForChallengesResult> {
  const { data, error } = await supabase.rpc('toggle_open_for_challenges', {
    p_group_id: groupId,
    p_open: open
  })
  if (error) throw error
  return data as ToggleOpenForChallengesResult
}

export interface ToggleMembersCanInviteResult {
  success: boolean
  message: string
  members_can_invite?: boolean
}

export async function toggleMembersCanInvite(groupId: string, enabled: boolean): Promise<ToggleMembersCanInviteResult> {
  const { data, error } = await supabase.rpc('toggle_members_can_invite', {
    p_group_id: groupId,
    p_enabled: enabled
  })
  if (error) throw error
  return data as ToggleMembersCanInviteResult
}

export interface OpenGroup {
  id: string
  name: string
  description: string | null
  member_count: number
  total_xp: number
  weekly_xp: number
  win_count: number
  loss_count: number
}

export async function browseOpenGroups(excludeGroupId?: string): Promise<OpenGroup[]> {
  const { data, error } = await supabase.rpc('browse_open_groups', {
    p_exclude_group_id: excludeGroupId
  })
  if (error) throw error
  return (data ?? []) as OpenGroup[]
}
