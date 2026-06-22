CREATE DATABASE SelfImprovementDB;
GO
USE SelfImprovementDB;
GO

-- 1. Table for your 150+ quotes and personal secrets
CREATE TABLE Quotes (
    QuoteID INT IDENTITY(1,1) PRIMARY KEY,
    QuoteText NVARCHAR(MAX) NOT NULL,
    Author NVARCHAR(255) DEFAULT 'Unknown',
    IsSecret BIT DEFAULT 0 -- 1 for personal secrets, 0 for public quotes
);

-- 2. Table for your static 10-thing daily checklist items
CREATE TABLE DailyChecklist (
    ItemID INT IDENTITY(1,1) PRIMARY KEY,
    ItemName NVARCHAR(255) NOT NULL
);

-- 3. Table to log things you've actually completed/done
CREATE TABLE ActivityLog (
    LogID INT IDENTITY(1,1) PRIMARY KEY,
    ActivityText NVARCHAR(MAX) NOT NULL,
    DateCompleted DATE DEFAULT GETDATE(),
    TimeCompleted TIME DEFAULT CONVERT(TIME, GETDATE())
);

-- 4. Table for your standard "Things To Do" list (Dynamic Tasks)
CREATE TABLE TodoList (
    TaskID INT IDENTITY(1,1) PRIMARY KEY,
    TaskName NVARCHAR(255) NOT NULL,
    IsCompleted BIT DEFAULT 0,
    CreatedDate DATE DEFAULT GETDATE()
);

USE SelfImprovementDB;
GO

-- Insert 50 inspirational and self-improvement quotes
INSERT INTO Quotes (QuoteText, Author, IsSecret) VALUES 
('The only way to do great work is to love what you do.', 'Steve Jobs', 0),
('Be yourself; everyone else is already taken.', 'Oscar Wilde', 0),
('Remember: Take a deep breath. You are doing much better than you think you are.', 'Myself', 1),
('Act as if what you do makes a difference. It does.', 'William James', 0),
('Success is not final, failure is not fatal: it is the courage to continue that counts.', 'Winston Churchill', 0),
('Never bend your head. Always hold it high. Look the world straight in the eye.', 'Helen Keller', 0),
('What you get by achieving your goals is not as important as what you become by achieving your goals.', 'Zig Ziglar', 0),
('Believe you can and you''re halfway there.', 'Theodore Roosevelt', 0),
('When you have a dream, you''ve got to grab it and never let go.', 'Carol Burnett', 0),
('I can''t change the direction of the wind, but I can adjust my sails to always reach my destination.', 'Jimmy Dean', 0),
('No matter what what people tell you, words and ideas can change the world.', 'Robin Williams', 0),
('It is during our darkest moments that we must focus to see the light.', 'Aristotle', 0),
('Keep your face always toward the sunshine, and shadows will fall behind you.', 'Walt Whitman', 0),
('You are never too old to set another goal or to dream a new dream.', 'C.S. Lewis', 0),
('The bad news is time flies. The good news is you''re the pilot.', 'Michael Altshuler', 0),
('Do not allow people to dim your shine because they are blinded by your light.', 'Lady Gaga', 0),
('You make a life out of what you have, not what you''re missing.', 'Kate Morton', 0),
('The secret of getting ahead is getting started.', 'Mark Twain', 0),
('The best way to predict the future is to create it.', 'Peter Drucker', 0),
('It always seems impossible until it''s done.', 'Nelson Mandela', 0),
('Happiness is not something ready-made. It comes from your own actions.', 'Dalai Lama', 0),
('Don''t count the days, make the days count.', 'Muhammad Ali', 0),
('We become what we think about.', 'Earl Nightingale', 0),
('An unexamined life is not worth living.', 'Socrates', 0),
('The only true wisdom is in knowing you know nothing.', 'Socrates', 0),
('Everything you''ve ever wanted is on the other side of fear.', 'George Addair', 0),
('Opportunities don''t happen. You create them.', 'Chris Grosser', 0),
('Great minds discuss ideas; average minds discuss events; small minds discuss people.', 'Eleanor Roosevelt', 0),
('A person who never made a mistake never tried anything new.', 'Albert Einstein', 0),
('Your time is limited, so don''t waste it living someone else''s life.', 'Steve Jobs', 0),
('The only impossible journey is the one you never begin.', 'Tony Robbins', 0),
('The best and most beautiful things in the world cannot be seen or even touched - they must be felt with the heart.', 'Helen Keller', 0),
('In the middle of every difficulty lies opportunity.', 'Albert Einstein', 0),
('Go confidently in the direction of your dreams. Live the life you have imagined.', 'Henry David Thoreau', 0),
('Do what you can, with what you have, where you are.', 'Theodore Roosevelt', 0),
('If you want to lift yourself up, lift up someone else.', 'Booker T. Washington', 0),
('You miss 100% of the shots you don''t take.', 'Wayne Gretzky', 0),
('Whether you think you can or you think you can''t, you''re right.', 'Henry Ford', 0),
('Perfection is not attainable, but if we chase perfection we can catch excellence.', 'Vince Lombardi', 0),
('I have not failed. I''ve just found 10,000 ways that won''t work.', 'Thomas A. Edison', 0),
('Concentrate all your thoughts upon the work at hand. The sun''s rays do not burn until brought to a focus.', 'Alexander Graham Bell', 0),
('There is only one corner of the universe you can be certain of improving, and that''s your own self.', 'Aldous Huxley', 0),
('Waste no more time arguing about what a good man should be. Be one.', 'Marcus Aurelius', 0),
('The happiness of your life depends upon the quality of your thoughts.', 'Marcus Aurelius', 0),
('You have power over your mind - not outside events. Realize this, and you will find strength.', 'Marcus Aurelius', 0),
('We suffer more often in imagination than in reality.', 'Seneca', 0),
('If a man knows not which port he sails, no wind is favorable.', 'Seneca', 0),
('Begin at once to live, and count each separate day as a separate life.', 'Seneca', 0),
('He who is brave is free.', 'Seneca', 0),
('The point is not to pay back kindness, but to pass it on.', 'Julia Alvarez', 0),
('Make each day your masterpiece.', 'John Wooden', 0);

SELECT * FROM Quotes;

SELECT local_net_address, local_tcp_port 
FROM sys.dm_exec_connections 
WHERE session_id = @@SPID;

TRUNCATE TABLE DailyChecklist;
