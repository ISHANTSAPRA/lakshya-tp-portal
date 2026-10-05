CREATE DATABASE IF NOT EXISTS lakshya_tp;
USE lakshya_tp;

CREATE TABLE training_partners (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(150) NOT NULL,
  pan VARCHAR(20) NOT NULL UNIQUE,
  gst VARCHAR(30) NULL,
  contact_person VARCHAR(120) NOT NULL,
  email VARCHAR(150) NOT NULL UNIQUE,
  phone VARCHAR(20) NOT NULL,
  address VARCHAR(255) NOT NULL,
  status ENUM('ACTIVE','INACTIVE') NOT NULL DEFAULT 'ACTIVE',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  training_partner_id INT NULL,
  centre_id INT NULL,
  name VARCHAR(120) NOT NULL,
  email VARCHAR(150) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('ADMIN','HO','CENTRE') NOT NULL,
  status ENUM('ACTIVE','INACTIVE') NOT NULL DEFAULT 'ACTIVE',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_user_tp FOREIGN KEY (training_partner_id)
    REFERENCES training_partners(id) ON DELETE CASCADE
);

CREATE TABLE training_centres (
  id INT AUTO_INCREMENT PRIMARY KEY,
  training_partner_id INT NOT NULL,
  name VARCHAR(150) NOT NULL,
  code VARCHAR(50) NOT NULL,
  address VARCHAR(255) NOT NULL,
  contact_person VARCHAR(120) NOT NULL,
  phone VARCHAR(20) NOT NULL,
  email VARCHAR(150) NULL,
  status ENUM('ACTIVE','INACTIVE') NOT NULL DEFAULT 'ACTIVE',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_centre_code_tp (training_partner_id, code),
  CONSTRAINT fk_centre_tp FOREIGN KEY (training_partner_id)
    REFERENCES training_partners(id) ON DELETE CASCADE
);

ALTER TABLE users
  ADD CONSTRAINT fk_user_centre FOREIGN KEY (centre_id)
  REFERENCES training_centres(id) ON DELETE CASCADE;

CREATE TABLE courses (
  id INT AUTO_INCREMENT PRIMARY KEY,
  training_partner_id INT NOT NULL,
  name VARCHAR(150) NOT NULL,
  fee DECIMAL(12,2) NOT NULL DEFAULT 0,
  status ENUM('ACTIVE','INACTIVE') NOT NULL DEFAULT 'ACTIVE',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_course_tp FOREIGN KEY (training_partner_id)
    REFERENCES training_partners(id) ON DELETE CASCADE
);

CREATE TABLE centre_courses (
  centre_id INT NOT NULL,
  course_id INT NOT NULL,
  assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (centre_id, course_id),
  CONSTRAINT fk_cc_centre FOREIGN KEY (centre_id)
    REFERENCES training_centres(id) ON DELETE CASCADE,
  CONSTRAINT fk_cc_course FOREIGN KEY (course_id)
    REFERENCES courses(id) ON DELETE CASCADE
);

CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_tp ON users(training_partner_id);
CREATE INDEX idx_users_centre ON users(centre_id);
CREATE INDEX idx_centres_tp ON training_centres(training_partner_id);
CREATE INDEX idx_courses_tp ON courses(training_partner_id);
