-- Create the leaderboard table
CREATE TABLE public.leaderboard (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    player_name TEXT NOT NULL,
    total_score INTEGER NOT NULL,
    relative_to_par INTEGER NOT NULL,
    date_played TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.leaderboard ENABLE ROW LEVEL SECURITY;

-- Create policy to allow anyone to read the leaderboard
CREATE POLICY "Allow public read access"
    ON public.leaderboard
    FOR SELECT
    USING (true);

-- Create policy to allow anyone to insert new scores
CREATE POLICY "Allow public insert access"
    ON public.leaderboard
    FOR INSERT
    WITH CHECK (true);

-- Create policy to allow updates only if the new score is better
-- Note: In golf, lower scores are better, so we check if new score is less than existing
CREATE POLICY "Allow update only if score is better"
    ON public.leaderboard
    FOR UPDATE
    USING (
        auth.uid() IS NOT NULL AND 
        (total_score > new.total_score)
    );

-- Create an index on total_score for faster leaderboard queries
CREATE INDEX idx_leaderboard_score ON public.leaderboard(total_score);

-- Create an index on date_played for time-based queries
CREATE INDEX idx_leaderboard_date ON public.leaderboard(date_played);

-- Comment on table and columns for better documentation
COMMENT ON TABLE public.leaderboard IS 'Stores player scores for the mini golf game';
COMMENT ON COLUMN public.leaderboard.player_name IS 'Name of the player';
COMMENT ON COLUMN public.leaderboard.total_score IS 'Total score across all holes';
COMMENT ON COLUMN public.leaderboard.relative_to_par IS 'Score relative to par (negative is better)';
COMMENT ON COLUMN public.leaderboard.date_played IS 'When the game was completed'; 
