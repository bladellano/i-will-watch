export interface RecentAddition {
  item_id: string
  member_name: string
  title: string
  original_title: string | null
  media_type: 'movie' | 'tv'
  tmdb_id: number
  release_date: string | null
  poster_path: string | null
  overview: string | null
  tmdb_rating: number | null
  genres: string[] | null
  like_count: number
  liked_by_me: boolean
  is_own: boolean
  added_at: string
}
