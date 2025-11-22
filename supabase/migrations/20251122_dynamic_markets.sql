-- Create assets table for dynamic market data
CREATE TABLE IF NOT EXISTS public.assets (
  id integer PRIMARY KEY,
  name text NOT NULL,
  market text NOT NULL, -- 'EPL', 'UCL', 'WC', 'SPL', 'F1'
  bid numeric NOT NULL,
  offer numeric NOT NULL,
  last_change text DEFAULT 'none',
  color text,
  category text DEFAULT 'football',
  updated_at timestamptz DEFAULT now()
);

-- Enable Realtime for assets table
ALTER PUBLICATION supabase_realtime ADD TABLE public.assets;

-- Seed Data (Generated from marketData.ts)

-- EPL
INSERT INTO public.assets (id, name, market, bid, offer, color, category) VALUES
(1, 'Arsenal', 'EPL', 54.3, 54.6, '#EF0107', 'football'),
(2, 'Man City', 'EPL', 29.0, 29.4, '#6CABDD', 'football'),
(3, 'Liverpool', 'EPL', 7.7, 8.0, '#C8102E', 'football'),
(4, 'Chelsea', 'EPL', 4.0, 4.3, '#034694', 'football'),
(5, 'Man Utd', 'EPL', 2.4, 2.5, '#DA291C', 'football'),
(6, 'Tottenham', 'EPL', 0.1, 0.2, '#132257', 'football'),
(7, 'Sunderland', 'EPL', 0.1, 0.2, '#EB172B', 'football'),
(8, 'Bournemouth', 'EPL', 0.1, 0.2, '#DA291C', 'football'),
(9, 'Crystal Palace', 'EPL', 0.1, 0.2, '#1B458F', 'football'),
(10, 'Newcastle', 'EPL', 0.1, 0.2, '#241F20', 'football'),
(11, 'Brighton', 'EPL', 0.1, 0.2, '#0057B8', 'football'),
(12, 'Aston Villa', 'EPL', 0.1, 0.2, '#95BFE5', 'football'),
(13, 'Nottm Forest', 'EPL', 0.1, 0.2, '#DD0000', 'football'),
(14, 'Everton', 'EPL', 0.1, 0.2, '#003399', 'football'),
(15, 'West Ham', 'EPL', 0.1, 0.2, '#7A263A', 'football'),
(16, 'Fulham', 'EPL', 0.1, 0.2, '#CC0000', 'football'),
(17, 'Wolves', 'EPL', 0.1, 0.2, '#FDB913', 'football'),
(18, 'Brentford', 'EPL', 0.1, 0.2, '#E30613', 'football'),
(19, 'Leeds', 'EPL', 0.1, 0.2, '#FFCD00', 'football'),
(20, 'Burnley', 'EPL', 0.1, 0.2, '#6C1D45', 'football')
ON CONFLICT (id) DO UPDATE SET
bid = EXCLUDED.bid, offer = EXCLUDED.offer, color = EXCLUDED.color;

-- UCL
INSERT INTO public.assets (id, name, market, bid, offer, color, category) VALUES
(101, 'Arsenal', 'UCL', 5.5, 5.7, '#EF0107', 'football'), -- Calculated prices approx
(102, 'Bayern Munich', 'UCL', 5.5, 5.7, '#DC052D', 'football'),
(103, 'PSG', 'UCL', 7.0, 7.2, '#004170', 'football'),
(104, 'Liverpool', 'UCL', 8.0, 8.2, '#C8102E', 'football'),
(105, 'Man City', 'UCL', 8.0, 8.2, '#6CABDD', 'football'),
(106, 'Barcelona', 'UCL', 10.0, 10.2, '#004D98', 'football'),
(107, 'Real Madrid', 'UCL', 10.0, 10.2, '#FEBE10', 'football'),
(108, 'Chelsea', 'UCL', 26.0, 26.4, '#034694', 'football'),
(109, 'Inter Milan', 'UCL', 26.0, 26.4, '#010E80', 'football'),
(110, 'Newcastle', 'UCL', 41.0, 41.5, '#241F20', 'football'),
(111, 'Atletico Madrid', 'UCL', 41.0, 41.5, '#CB3524', 'football'),
(112, 'Tottenham', 'UCL', 41.0, 41.5, '#132257', 'football'),
(113, 'Borussia Dortmund', 'UCL', 67.0, 67.8, '#FDE100', 'football'),
(114, 'Napoli', 'UCL', 51.0, 51.6, '#003E90', 'football'),
(115, 'Galatasaray', 'UCL', 81.0, 81.9, '#A90432', 'football'),
(116, 'Atalanta', 'UCL', 126.0, 127.0, '#1F2F57', 'football'),
(117, 'Juventus', 'UCL', 151.0, 152.0, '#000000', 'football'),
(118, 'Sporting Lisbon', 'UCL', 151.0, 152.0, '#06854C', 'football'),
(119, 'Bayer Leverkusen', 'UCL', 126.0, 127.0, '#E32219', 'football'),
(120, 'PSV', 'UCL', 151.0, 152.0, '#FF0000', 'football'),
(121, 'Marseille', 'UCL', 251.0, 252.0, '#009DDC', 'football'),
(122, 'Monaco', 'UCL', 151.0, 152.0, '#E70018', 'football'),
(123, 'Athletic Bilbao', 'UCL', 201.0, 202.0, '#EE2523', 'football'),
(124, 'Villarreal', 'UCL', 251.0, 252.0, '#F5E20B', 'football'),
(125, 'Eintracht Frankfurt', 'UCL', 201.0, 202.0, '#E1000F', 'football'),
(126, 'Benfica', 'UCL', 751.0, 752.0, '#E83034', 'football'),
(127, 'Olympiakos', 'UCL', 501.0, 502.0, '#D60220', 'football'),
(128, 'Club Brugge', 'UCL', 501.0, 502.0, '#0068B4', 'football'),
(129, 'Union St Gilloise', 'UCL', 1001.0, 1002.0, '#FDE100', 'football'),
(130, 'FK Qarabag', 'UCL', 1001.0, 1002.0, '#000000', 'football'),
(131, 'Bodo Glimt', 'UCL', 1001.0, 1002.0, '#FDE100', 'football'),
(132, 'Ajax', 'UCL', 1501.0, 1502.0, '#D2122E', 'football'),
(133, 'Slavia Prague', 'UCL', 1501.0, 1502.0, '#D2122E', 'football'),
(134, 'FC Copenhagen', 'UCL', 1501.0, 1502.0, '#00529F', 'football'),
(135, 'AEP Paphos', 'UCL', 1501.0, 1502.0, '#00529F', 'football'),
(136, 'Kairat Almaty', 'UCL', 4001.0, 4002.0, '#FDE100', 'football')
ON CONFLICT (id) DO UPDATE SET
bid = EXCLUDED.bid, offer = EXCLUDED.offer, color = EXCLUDED.color;

-- WC
INSERT INTO public.assets (id, name, market, bid, offer, color, category) VALUES
(201, 'Spain', 'WC', 5.5, 5.7, '#AA151B', 'football'),
(202, 'England', 'WC', 7.0, 7.2, '#CE1124', 'football'),
(203, 'France', 'WC', 8.0, 8.2, '#002395', 'football'),
(204, 'Brazil', 'WC', 9.0, 9.2, '#009B3A', 'football'),
(205, 'Argentina', 'WC', 9.0, 9.2, '#74ACDF', 'football'),
(206, 'Portugal', 'WC', 11.0, 11.2, '#E42518', 'football'),
(207, 'Germany', 'WC', 13.0, 13.2, '#000000', 'football'),
(208, 'Netherlands', 'WC', 21.0, 21.2, '#F36C21', 'football'),
(209, 'Norway', 'WC', 34.0, 34.2, '#BA0C2F', 'football'),
(210, 'Italy', 'WC', 34.0, 34.2, '#0064AA', 'football'),
(211, 'Belgium', 'WC', 51.0, 51.2, '#E30613', 'football'),
(212, 'Uruguay', 'WC', 51.0, 51.2, '#0038A8', 'football'),
(213, 'Colombia', 'WC', 51.0, 51.2, '#FCD116', 'football'),
(214, 'Mexico', 'WC', 81.0, 81.2, '#006847', 'football'),
(215, 'USA', 'WC', 81.0, 81.2, '#3C3B6E', 'football'),
(216, 'Japan', 'WC', 101.0, 101.2, '#BC002D', 'football'),
(217, 'Croatia', 'WC', 101.0, 101.2, '#FF0000', 'football'),
(218, 'Ecuador', 'WC', 101.0, 101.2, '#FFCD00', 'football'),
(219, 'Morocco', 'WC', 101.0, 101.2, '#C1272D', 'football'),
(220, 'Switzerland', 'WC', 101.0, 101.2, '#FF0000', 'football'),
(221, 'Austria', 'WC', 151.0, 151.2, '#ED2939', 'football'),
(222, 'Senegal', 'WC', 126.0, 126.2, '#00853F', 'football'),
(223, 'Denmark', 'WC', 201.0, 201.2, '#C60C30', 'football'),
(224, 'Sweden', 'WC', 151.0, 151.2, '#FECC00', 'football'),
(225, 'Ivory Coast', 'WC', 201.0, 201.2, '#FF8200', 'football'),
(226, 'Poland', 'WC', 251.0, 251.2, '#DC143C', 'football'),
(227, 'Turkey', 'WC', 251.0, 251.2, '#E30A17', 'football'),
(228, 'Canada', 'WC', 251.0, 251.2, '#FF0000', 'football'),
(229, 'Egypt', 'WC', 251.0, 251.2, '#CE1126', 'football'),
(230, 'Paraguay', 'WC', 151.0, 151.2, '#D52B1E', 'football'),
(231, 'Ukraine', 'WC', 201.0, 201.2, '#FFD700', 'football'),
(232, 'Algeria', 'WC', 201.0, 201.2, '#006233', 'football'),
(233, 'South Korea', 'WC', 151.0, 151.2, '#003478', 'football'),
(234, 'Romania', 'WC', 501.0, 501.2, '#FCD116', 'football'),
(235, 'Australia', 'WC', 501.0, 501.2, '#FFCD00', 'football'),
(236, 'Scotland', 'WC', 251.0, 251.2, '#005EB8', 'football'),
(237, 'Ghana', 'WC', 151.0, 151.2, '#006B3F', 'football'),
(238, 'Iran', 'WC', 501.0, 501.2, '#DA0000', 'football'),
(239, 'Wales', 'WC', 251.0, 251.2, '#D30731', 'football'),
(240, 'Tunisia', 'WC', 401.0, 401.2, '#E70013', 'football'),
(241, 'Slovakia', 'WC', 501.0, 501.2, '#0B4EA2', 'football'),
(242, 'Bolivia', 'WC', 251.0, 251.2, '#007934', 'football'),
(243, 'Czech Republic', 'WC', 501.0, 501.2, '#11457E', 'football'),
(244, 'Qatar', 'WC', 1001.0, 1001.2, '#8A1538', 'football'),
(245, 'Republic of Ireland', 'WC', 1001.0, 1001.2, '#169B62', 'football'),
(246, 'New Zealand', 'WC', 1001.0, 1001.2, '#000000', 'football'),
(247, 'Saudi Arabia', 'WC', 1001.0, 1001.2, '#006C35', 'football'),
(248, 'North Macedonia', 'WC', 501.0, 501.2, '#D20000', 'football'),
(249, 'DR Congo', 'WC', 751.0, 751.2, '#007FFF', 'football'),
(250, 'Panama', 'WC', 751.0, 751.2, '#DA121A', 'football'),
(251, 'Albania', 'WC', 1001.0, 1001.2, '#E41E20', 'football'),
(252, 'Northern Ireland', 'WC', 751.0, 751.2, '#00985A', 'football'),
(253, 'Iraq', 'WC', 1001.0, 1001.2, '#007A3D', 'football'),
(254, 'Kosovo', 'WC', 751.0, 751.2, '#244AA5', 'football'),
(255, 'Curacao', 'WC', 2001.0, 2001.2, '#002B7F', 'football'),
(256, 'Cape Verde', 'WC', 2001.0, 2001.2, '#003893', 'football'),
(257, 'Jamaica', 'WC', 1001.0, 1001.2, '#FED100', 'football'),
(258, 'Suriname', 'WC', 2001.0, 2001.2, '#377E3F', 'football'),
(259, 'Jordan', 'WC', 2501.0, 2501.2, '#CE1126', 'football'),
(260, 'Haiti', 'WC', 4501.0, 4501.2, '#D21034', 'football')
ON CONFLICT (id) DO UPDATE SET
bid = EXCLUDED.bid, offer = EXCLUDED.offer, color = EXCLUDED.color;

-- SPL
INSERT INTO public.assets (id, name, market, bid, offer, color, category) VALUES
(301, 'AL Hilal', 'SPL', 2.1, 2.3, '#005CA9', 'football'),
(302, 'Al-Nassr Riyadh', 'SPL', 2.5, 2.7, '#FCD116', 'football'),
(303, 'Al Qadisiyah FC', 'SPL', 13.0, 13.2, '#D71920', 'football'),
(304, 'Al Ittihad Jeddah', 'SPL', 13.0, 13.2, '#FCD116', 'football'),
(305, 'Al Ahli Jeddah', 'SPL', 13.0, 13.2, '#006C35', 'football'),
(306, 'Al Taawon', 'SPL', 21.0, 21.2, '#FCD116', 'football'),
(307, 'Al Khaleej Saihat', 'SPL', 101.0, 101.2, '#006C35', 'football'),
(308, 'Neom SC', 'SPL', 101.0, 101.2, '#000000', 'football'),
(309, 'Al Ittifaq Dammam', 'SPL', 251.0, 251.2, '#006C35', 'football'),
(310, 'Al Kholood Ar Rass', 'SPL', 351.0, 351.2, '#D71920', 'football'),
(311, 'Al Shabab', 'SPL', 501.0, 501.2, '#000000', 'football'),
(312, 'Al Riyadh', 'SPL', 1001.0, 1001.2, '#D71920', 'football'),
(313, 'Al Fateh SC', 'SPL', 1001.0, 1001.2, '#005CA9', 'football'),
(314, 'Al Feiha', 'SPL', 1001.0, 1001.2, '#F36C21', 'football'),
(315, 'Al Hazm', 'SPL', 2001.0, 2001.2, '#FCD116', 'football'),
(316, 'Al Akhdoud', 'SPL', 2001.0, 2001.2, '#005CA9', 'football'),
(317, 'Damac FC', 'SPL', 2501.0, 2501.2, '#D71920', 'football'),
(318, 'Al Najma', 'SPL', 4001.0, 4001.2, '#006C35', 'football')
ON CONFLICT (id) DO UPDATE SET
bid = EXCLUDED.bid, offer = EXCLUDED.offer, color = EXCLUDED.color;

-- F1
INSERT INTO public.assets (id, name, market, bid, offer, color, category) VALUES
(401, 'Lando Norris', 'F1', 1.14, 1.34, '#FF8000', 'f1'),
(402, 'Oscar Piastri', 'F1', 7.0, 7.2, '#FF8000', 'f1'),
(403, 'Max Verstappen', 'F1', 15.0, 15.2, '#0600EF', 'f1')
ON CONFLICT (id) DO UPDATE SET
bid = EXCLUDED.bid, offer = EXCLUDED.offer, color = EXCLUDED.color;
