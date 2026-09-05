-- Rivers State Gazetteer seed
-- Major communities, wards and LGAs with approximate centroids
-- Source: Rivers State boundary data (public domain)

INSERT INTO gazetteer (id, name, lga, ward, latitude, longitude, created_at, updated_at) VALUES

-- Port Harcourt City LGA
(gen_random_uuid(), 'Port Harcourt', 'Port Harcourt City', 'Central', 4.8156, 7.0498, NOW(), NOW()),
(gen_random_uuid(), 'Old GRA', 'Port Harcourt City', 'Old GRA', 4.8244, 7.0361, NOW(), NOW()),
(gen_random_uuid(), 'New GRA', 'Port Harcourt City', 'New GRA', 4.8029, 7.0215, NOW(), NOW()),
(gen_random_uuid(), 'D-Line', 'Port Harcourt City', 'D-Line', 4.8132, 7.0290, NOW(), NOW()),
(gen_random_uuid(), 'Diobu', 'Port Harcourt City', 'Diobu', 4.8390, 7.0098, NOW(), NOW()),
(gen_random_uuid(), 'Mile 1', 'Port Harcourt City', 'Diobu', 4.8453, 7.0211, NOW(), NOW()),
(gen_random_uuid(), 'Mile 2', 'Port Harcourt City', 'Diobu', 4.8520, 7.0189, NOW(), NOW()),
(gen_random_uuid(), 'Mile 3', 'Port Harcourt City', 'Diobu', 4.8611, 7.0132, NOW(), NOW()),
(gen_random_uuid(), 'Mile 4', 'Port Harcourt City', 'Diobu', 4.8690, 7.0076, NOW(), NOW()),
(gen_random_uuid(), 'Rumuola', 'Port Harcourt City', 'Rumuola', 4.8710, 7.0251, NOW(), NOW()),
(gen_random_uuid(), 'Trans-Amadi', 'Port Harcourt City', 'Trans-Amadi', 4.8499, 7.0499, NOW(), NOW()),
(gen_random_uuid(), 'Abuloma', 'Port Harcourt City', 'Abuloma', 4.7899, 7.0611, NOW(), NOW()),
(gen_random_uuid(), 'Borokiri', 'Port Harcourt City', 'Borokiri', 4.7745, 7.0480, NOW(), NOW()),
(gen_random_uuid(), 'Waterlines', 'Port Harcourt City', 'Waterlines', 4.7680, 7.0398, NOW(), NOW()),
(gen_random_uuid(), 'Elechi', 'Port Harcourt City', 'Elechi', 4.8050, 7.0610, NOW(), NOW()),
(gen_random_uuid(), 'Fimie', 'Port Harcourt City', 'Fimie', 4.7990, 7.0433, NOW(), NOW()),

-- Obio/Akpor LGA
(gen_random_uuid(), 'Rumuokoro', 'Obio/Akpor', 'Rumuokoro', 4.8956, 7.0344, NOW(), NOW()),
(gen_random_uuid(), 'Rumuigbo', 'Obio/Akpor', 'Rumuigbo', 4.9021, 7.0198, NOW(), NOW()),
(gen_random_uuid(), 'Rukpokwu', 'Obio/Akpor', 'Rukpokwu', 4.8798, 6.9987, NOW(), NOW()),
(gen_random_uuid(), 'Rumuodara', 'Obio/Akpor', 'Rumuodara', 4.9189, 7.0421, NOW(), NOW()),
(gen_random_uuid(), 'Ozuoba', 'Obio/Akpor', 'Ozuoba', 4.9310, 7.0199, NOW(), NOW()),
(gen_random_uuid(), 'Alakahia', 'Obio/Akpor', 'Alakahia', 4.9120, 7.0522, NOW(), NOW()),
(gen_random_uuid(), 'Choba', 'Obio/Akpor', 'Choba', 4.9290, 7.0560, NOW(), NOW()),
(gen_random_uuid(), 'Rumukurushi', 'Obio/Akpor', 'Rumukurushi', 4.9398, 7.0133, NOW(), NOW()),
(gen_random_uuid(), 'Woji', 'Obio/Akpor', 'Woji', 4.8655, 7.0033, NOW(), NOW()),
(gen_random_uuid(), 'Rumuepirikom', 'Obio/Akpor', 'Rumuepirikom', 4.8821, 7.0098, NOW(), NOW()),
(gen_random_uuid(), 'Rumola', 'Obio/Akpor', 'Rumola', 4.9011, 7.0399, NOW(), NOW()),
(gen_random_uuid(), 'Oro-Igwe', 'Obio/Akpor', 'Oro-Igwe', 4.9155, 7.0289, NOW(), NOW()),

-- Eleme LGA
(gen_random_uuid(), 'Eleme', 'Eleme', 'Eleme Central', 4.7944, 7.1211, NOW(), NOW()),
(gen_random_uuid(), 'Ogale', 'Eleme', 'Ogale', 4.7803, 7.1401, NOW(), NOW()),
(gen_random_uuid(), 'Agbonchia', 'Eleme', 'Agbonchia', 4.8011, 7.1099, NOW(), NOW()),
(gen_random_uuid(), 'Akpajo', 'Eleme', 'Akpajo', 4.7661, 7.0799, NOW(), NOW()),
(gen_random_uuid(), 'Eteo', 'Eleme', 'Eteo', 4.7799, 7.1299, NOW(), NOW()),
(gen_random_uuid(), 'Onne', 'Eleme', 'Onne', 4.7399, 7.1501, NOW(), NOW()),

-- Ikwerre LGA
(gen_random_uuid(), 'Isiokpo', 'Ikwerre', 'Isiokpo', 4.9921, 6.9011, NOW(), NOW()),
(gen_random_uuid(), 'Omerelu', 'Ikwerre', 'Omerelu', 5.0112, 6.8799, NOW(), NOW()),
(gen_random_uuid(), 'Igwuruta', 'Ikwerre', 'Igwuruta', 4.9599, 6.9299, NOW(), NOW()),
(gen_random_uuid(), 'Ndele', 'Ikwerre', 'Ndele', 5.0299, 6.9101, NOW(), NOW()),

-- Oyigbo LGA
(gen_random_uuid(), 'Oyigbo', 'Oyigbo', 'Oyigbo Central', 4.8350, 7.1802, NOW(), NOW()),
(gen_random_uuid(), 'Afam', 'Oyigbo', 'Afam', 4.8099, 7.1699, NOW(), NOW()),

-- Etche LGA
(gen_random_uuid(), 'Okehi', 'Etche', 'Okehi', 5.0944, 7.1511, NOW(), NOW()),
(gen_random_uuid(), 'Chokocho', 'Etche', 'Chokocho', 5.0612, 7.1299, NOW(), NOW()),

-- Okrika LGA
(gen_random_uuid(), 'Okrika', 'Okrika', 'Okrika Central', 4.7310, 7.0799, NOW(), NOW()),
(gen_random_uuid(), 'Ogbunabali', 'Port Harcourt City', 'Ogbunabali', 4.7944, 7.0544, NOW(), NOW()),

-- Gokana LGA (Ogoniland)
(gen_random_uuid(), 'Bori', 'Gokana', 'Bori', 4.6811, 7.3601, NOW(), NOW()),
(gen_random_uuid(), 'K-Dere', 'Gokana', 'K-Dere', 4.6699, 7.3299, NOW(), NOW()),

-- Khana LGA
(gen_random_uuid(), 'Sogho', 'Khana', 'Sogho', 4.6201, 7.4011, NOW(), NOW()),
(gen_random_uuid(), 'Luawii', 'Khana', 'Luawii', 4.6399, 7.4199, NOW(), NOW()),

-- Tai LGA
(gen_random_uuid(), 'Nonwa', 'Tai', 'Nonwa', 4.6944, 7.2999, NOW(), NOW()),
(gen_random_uuid(), 'Bori Camp', 'Tai', 'Bori Camp', 4.6711, 7.3101, NOW(), NOW())

ON CONFLICT DO NOTHING;
