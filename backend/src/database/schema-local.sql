-- Healthcare Appointment and Report Storage System
-- Complete Database Schema (Fully Normalized - 1NF, 2NF, 3NF)
-- Singular table names, snake_case convention

-- ============================================
-- DROP EXISTING TABLES (reverse dependency order)
-- ============================================
SET FOREIGN_KEY_CHECKS = 0;


SET FOREIGN_KEY_CHECKS = 1;

-- ============================================
-- CORE USER & AUTH TABLES
-- ============================================

CREATE TABLE role (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(50) NOT NULL UNIQUE,
  description VARCHAR(255),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE permission (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(100) NOT NULL UNIQUE,
  description VARCHAR(255),
  module VARCHAR(50) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE role_permission (
  id INT PRIMARY KEY AUTO_INCREMENT,
  role_id INT NOT NULL,
  permission_id INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (role_id) REFERENCES role(id) ON DELETE CASCADE,
  FOREIGN KEY (permission_id) REFERENCES permission(id) ON DELETE CASCADE,
  UNIQUE KEY unique_role_permission (role_id, permission_id)
);

CREATE TABLE user (
  id INT PRIMARY KEY AUTO_INCREMENT,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  phone VARCHAR(20),
  avatar_url VARCHAR(500),
  date_of_birth DATE,
  gender ENUM('male', 'female', 'other') DEFAULT NULL,
  address_line1 VARCHAR(255),
  address_line2 VARCHAR(255),
  city VARCHAR(100),
  state VARCHAR(100),
  zip_code VARCHAR(20),
  country VARCHAR(100) DEFAULT 'India',
  is_active BOOLEAN DEFAULT TRUE,
  is_verified BOOLEAN DEFAULT FALSE,
  last_login_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_user_email (email),
  INDEX idx_user_active (is_active)
);

CREATE TABLE user_role (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  role_id INT NOT NULL,
  assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES user(id) ON DELETE CASCADE,
  FOREIGN KEY (role_id) REFERENCES role(id) ON DELETE CASCADE,
  UNIQUE KEY unique_user_role (user_id, role_id)
);

CREATE TABLE session (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  token_hash VARCHAR(255) NOT NULL,
  ip_address VARCHAR(45),
  user_agent VARCHAR(500),
  expires_at TIMESTAMP NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES user(id) ON DELETE CASCADE,
  INDEX idx_session_user (user_id),
  INDEX idx_session_active (is_active)
);

CREATE TABLE refresh_token (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  token_hash VARCHAR(255) NOT NULL UNIQUE,
  expires_at TIMESTAMP NOT NULL,
  is_revoked BOOLEAN DEFAULT FALSE,
  revoked_at TIMESTAMP NULL,
  replaced_by VARCHAR(255),
  ip_address VARCHAR(45),
  user_agent VARCHAR(500),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES user(id) ON DELETE CASCADE,
  INDEX idx_refresh_token_user (user_id),
  INDEX idx_refresh_token_hash (token_hash)
);

-- ============================================
-- HOSPITAL & DEPARTMENT TABLES
-- ============================================

CREATE TABLE hospital (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  email VARCHAR(255),
  phone VARCHAR(20),
  website VARCHAR(255),
  logo_url VARCHAR(500),
  cover_image_url VARCHAR(500),
  address_line1 VARCHAR(255) NOT NULL,
  address_line2 VARCHAR(255),
  city VARCHAR(100) NOT NULL,
  state VARCHAR(100) NOT NULL,
  zip_code VARCHAR(20),
  country VARCHAR(100) DEFAULT 'India',
  registration_number VARCHAR(100) UNIQUE,
  established_year INT,
  bed_count INT DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  is_verified BOOLEAN DEFAULT FALSE,
  rating DECIMAL(3,2) DEFAULT 0.00,
  total_reviews INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_hospital_city (city),
  INDEX idx_hospital_active (is_active),
  FULLTEXT INDEX idx_hospital_search (name, description, city)
);

CREATE TABLE hospital_location (
  id INT PRIMARY KEY AUTO_INCREMENT,
  hospital_id INT NOT NULL UNIQUE,
  latitude DECIMAL(10, 8) NOT NULL,
  longitude DECIMAL(11, 8) NOT NULL,
  formatted_address VARCHAR(500),
  place_id VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (hospital_id) REFERENCES hospital(id) ON DELETE CASCADE,
  INDEX idx_location_coords (latitude, longitude)
);

CREATE TABLE department (
  id INT PRIMARY KEY AUTO_INCREMENT,
  hospital_id INT NOT NULL,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  head_doctor_id INT,
  floor_number VARCHAR(10),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (hospital_id) REFERENCES hospital(id) ON DELETE CASCADE,
  INDEX idx_department_hospital (hospital_id)
);

CREATE TABLE specialty (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(100) NOT NULL UNIQUE,
  description TEXT,
  icon VARCHAR(50),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- ============================================
-- PATIENT, DOCTOR, HOSPITAL ADMIN TABLES
-- ============================================

CREATE TABLE patient (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL UNIQUE,
  blood_group VARCHAR(5),
  emergency_contact_name VARCHAR(100),
  emergency_contact_phone VARCHAR(20),
  medical_history TEXT,
  allergies TEXT,
  insurance_provider VARCHAR(100),
  insurance_policy_number VARCHAR(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES user(id) ON DELETE CASCADE
);

CREATE TABLE doctor (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL UNIQUE,
  hospital_id INT,
  department_id INT,
  license_number VARCHAR(100) UNIQUE,
  qualification VARCHAR(255),
  experience_years INT DEFAULT 0,
  consultation_fee DECIMAL(10, 2) DEFAULT 0.00,
  bio TEXT,
  is_available BOOLEAN DEFAULT TRUE,
  rating DECIMAL(3, 2) DEFAULT 0.00,
  total_reviews INT DEFAULT 0,
  max_patients_per_day INT DEFAULT 20,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES user(id) ON DELETE CASCADE,
  FOREIGN KEY (hospital_id) REFERENCES hospital(id) ON DELETE SET NULL,
  FOREIGN KEY (department_id) REFERENCES department(id) ON DELETE SET NULL,
  INDEX idx_doctor_hospital (hospital_id),
  INDEX idx_doctor_available (is_available)
);

CREATE TABLE doctor_specialty (
  id INT PRIMARY KEY AUTO_INCREMENT,
  doctor_id INT NOT NULL,
  specialty_id INT NOT NULL,
  is_primary BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (doctor_id) REFERENCES doctor(id) ON DELETE CASCADE,
  FOREIGN KEY (specialty_id) REFERENCES specialty(id) ON DELETE CASCADE,
  UNIQUE KEY unique_doctor_specialty (doctor_id, specialty_id)
);

CREATE TABLE hospital_admin (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL UNIQUE,
  hospital_id INT NOT NULL,
  designation VARCHAR(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES user(id) ON DELETE CASCADE,
  FOREIGN KEY (hospital_id) REFERENCES hospital(id) ON DELETE CASCADE
);

-- Add FK for department head after doctor table exists
ALTER TABLE department ADD FOREIGN KEY (head_doctor_id) REFERENCES doctor(id) ON DELETE SET NULL;

-- ============================================
-- APPOINTMENT & SCHEDULING TABLES
-- ============================================

CREATE TABLE appointment_status (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(50) NOT NULL UNIQUE,
  description VARCHAR(255),
  color VARCHAR(20) DEFAULT '#6B7280',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE availability_slot (
  id INT PRIMARY KEY AUTO_INCREMENT,
  doctor_id INT NOT NULL,
  day_of_week TINYINT NOT NULL COMMENT '0=Sunday, 6=Saturday',
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  slot_duration INT DEFAULT 30 COMMENT 'Duration in minutes',
  max_bookings INT DEFAULT 1,
  is_active BOOLEAN DEFAULT TRUE,
  effective_from DATE,
  effective_until DATE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (doctor_id) REFERENCES doctor(id) ON DELETE CASCADE,
  INDEX idx_slot_doctor (doctor_id),
  INDEX idx_slot_day (day_of_week)
);

CREATE TABLE appointment (
  id INT PRIMARY KEY AUTO_INCREMENT,
  patient_id INT NOT NULL,
  doctor_id INT NOT NULL,
  hospital_id INT,
  slot_id INT,
  status_id INT NOT NULL DEFAULT 1,
  appointment_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  reason TEXT,
  notes TEXT,
  cancellation_reason TEXT,
  cancelled_by INT,
  rescheduled_from INT,
  is_follow_up BOOLEAN DEFAULT FALSE,
  consultation_type ENUM('in_person', 'video', 'phone') DEFAULT 'in_person',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (patient_id) REFERENCES patient(id) ON DELETE CASCADE,
  FOREIGN KEY (doctor_id) REFERENCES doctor(id) ON DELETE CASCADE,
  FOREIGN KEY (hospital_id) REFERENCES hospital(id) ON DELETE SET NULL,
  FOREIGN KEY (slot_id) REFERENCES availability_slot(id) ON DELETE SET NULL,
  FOREIGN KEY (status_id) REFERENCES appointment_status(id),
  FOREIGN KEY (cancelled_by) REFERENCES user(id) ON DELETE SET NULL,
  FOREIGN KEY (rescheduled_from) REFERENCES appointment(id) ON DELETE SET NULL,
  INDEX idx_appointment_patient (patient_id),
  INDEX idx_appointment_doctor (doctor_id),
  INDEX idx_appointment_date (appointment_date),
  INDEX idx_appointment_status (status_id)
);

-- ============================================
-- MEDICAL REPORTS & PRESCRIPTIONS
-- ============================================

CREATE TABLE medical_report (
  id INT PRIMARY KEY AUTO_INCREMENT,
  patient_id INT NOT NULL,
  appointment_id INT,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  file_name VARCHAR(255) NOT NULL,
  file_type VARCHAR(50) NOT NULL,
  file_size INT NOT NULL,
  firebase_path VARCHAR(500) NOT NULL,
  firebase_url VARCHAR(1000),
  report_type ENUM('lab_result', 'imaging', 'prescription', 'discharge_summary', 'other') DEFAULT 'other',
  report_date DATE,
  is_confidential BOOLEAN DEFAULT FALSE,
  uploaded_by INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (patient_id) REFERENCES patient(id) ON DELETE CASCADE,
  FOREIGN KEY (appointment_id) REFERENCES appointment(id) ON DELETE SET NULL,
  FOREIGN KEY (uploaded_by) REFERENCES user(id) ON DELETE CASCADE,
  INDEX idx_report_patient (patient_id),
  INDEX idx_report_type (report_type)
);

CREATE TABLE report_access (
  id INT PRIMARY KEY AUTO_INCREMENT,
  report_id INT NOT NULL,
  doctor_id INT NOT NULL,
  granted_by INT NOT NULL,
  access_type ENUM('view', 'download') DEFAULT 'view',
  expires_at TIMESTAMP,
  is_revoked BOOLEAN DEFAULT FALSE,
  revoked_at TIMESTAMP NULL,
  accessed_at TIMESTAMP NULL,
  access_count INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (report_id) REFERENCES medical_report(id) ON DELETE CASCADE,
  FOREIGN KEY (doctor_id) REFERENCES doctor(id) ON DELETE CASCADE,
  FOREIGN KEY (granted_by) REFERENCES user(id) ON DELETE CASCADE,
  INDEX idx_access_report (report_id),
  INDEX idx_access_doctor (doctor_id)
);

CREATE TABLE prescription (
  id INT PRIMARY KEY AUTO_INCREMENT,
  appointment_id INT NOT NULL,
  doctor_id INT NOT NULL,
  patient_id INT NOT NULL,
  diagnosis TEXT,
  medications JSON,
  instructions TEXT,
  follow_up_date DATE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (appointment_id) REFERENCES appointment(id) ON DELETE CASCADE,
  FOREIGN KEY (doctor_id) REFERENCES doctor(id) ON DELETE CASCADE,
  FOREIGN KEY (patient_id) REFERENCES patient(id) ON DELETE CASCADE,
  INDEX idx_prescription_appointment (appointment_id)
);

-- ============================================
-- REVIEWS & NOTIFICATIONS
-- ============================================

CREATE TABLE review (
  id INT PRIMARY KEY AUTO_INCREMENT,
  patient_id INT NOT NULL,
  doctor_id INT NOT NULL,
  appointment_id INT,
  rating DECIMAL(2,1) NOT NULL CHECK (rating >= 1 AND rating <= 5),
  title VARCHAR(255),
  comment TEXT,
  is_anonymous BOOLEAN DEFAULT FALSE,
  is_visible BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (patient_id) REFERENCES patient(id) ON DELETE CASCADE,
  FOREIGN KEY (doctor_id) REFERENCES doctor(id) ON DELETE CASCADE,
  FOREIGN KEY (appointment_id) REFERENCES appointment(id) ON DELETE SET NULL,
  INDEX idx_review_doctor (doctor_id)
);

CREATE TABLE hospital_review (
  id INT AUTO_INCREMENT PRIMARY KEY,
  hospital_id INT NOT NULL,
  patient_id INT NOT NULL,
  rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (hospital_id) REFERENCES hospital(id) ON DELETE CASCADE,
  FOREIGN KEY (patient_id) REFERENCES patient(id) ON DELETE CASCADE,
  UNIQUE KEY unique_patient_hospital (patient_id, hospital_id)
);

CREATE TABLE notification (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  type ENUM('appointment', 'report', 'system', 'reminder', 'access') DEFAULT 'system',
  reference_type VARCHAR(50),
  reference_id INT,
  is_read BOOLEAN DEFAULT FALSE,
  read_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES user(id) ON DELETE CASCADE,
  INDEX idx_notification_user (user_id),
  INDEX idx_notification_read (is_read)
);

-- ============================================
-- AUDIT & ACTIVITY LOGS
-- ============================================

CREATE TABLE audit_log (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT,
  action VARCHAR(100) NOT NULL,
  entity_type VARCHAR(50) NOT NULL,
  entity_id INT,
  old_values JSON,
  new_values JSON,
  ip_address VARCHAR(45),
  user_agent VARCHAR(500),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES user(id) ON DELETE SET NULL,
  INDEX idx_audit_user (user_id),
  INDEX idx_audit_entity (entity_type, entity_id),
  INDEX idx_audit_created (created_at)
);

CREATE TABLE activity_log (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT,
  activity VARCHAR(255) NOT NULL,
  details TEXT,
  module VARCHAR(50),
  ip_address VARCHAR(45),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES user(id) ON DELETE SET NULL,
  INDEX idx_activity_user (user_id),
  INDEX idx_activity_module (module)
);

-- ============================================
-- SEED DATA
-- ============================================

-- Insert default roles
INSERT INTO role (name, description) VALUES
('patient', 'Patient user role'),
('doctor', 'Doctor/Physician role'),
('hospital_admin', 'Hospital Administrator role'),
('super_admin', 'Super Administrator with full access');

-- Insert default permissions
INSERT INTO permission (name, description, module) VALUES
-- User permissions
('user.view', 'View user profiles', 'user'),
('user.create', 'Create new users', 'user'),
('user.update', 'Update user information', 'user'),
('user.delete', 'Delete users', 'user'),
-- Patient permissions
('patient.view', 'View patient records', 'patient'),
('patient.update', 'Update patient records', 'patient'),
-- Doctor permissions
('doctor.view', 'View doctor profiles', 'doctor'),
('doctor.update', 'Update doctor profiles', 'doctor'),
('doctor.manage_schedule', 'Manage doctor schedules', 'doctor'),
-- Hospital permissions
('hospital.view', 'View hospital information', 'hospital'),
('hospital.create', 'Create new hospitals', 'hospital'),
('hospital.update', 'Update hospital information', 'hospital'),
('hospital.delete', 'Delete hospitals', 'hospital'),
('hospital.manage_doctors', 'Manage hospital doctors', 'hospital'),
('hospital.manage_departments', 'Manage hospital departments', 'hospital'),
-- Appointment permissions
('appointment.view', 'View appointments', 'appointment'),
('appointment.create', 'Create appointments', 'appointment'),
('appointment.update', 'Update appointments', 'appointment'),
('appointment.cancel', 'Cancel appointments', 'appointment'),
-- Report permissions
('report.view', 'View medical reports', 'report'),
('report.upload', 'Upload medical reports', 'report'),
('report.share', 'Share medical reports', 'report'),
('report.delete', 'Delete medical reports', 'report'),
-- Review permissions
('review.create', 'Create reviews', 'review'),
('review.view', 'View reviews', 'review'),
('review.delete', 'Delete reviews', 'review'),
-- Analytics permissions
('analytics.view', 'View analytics', 'analytics'),
('analytics.export', 'Export analytics data', 'analytics'),
-- Admin permissions
('admin.manage_users', 'Manage all users', 'admin'),
('admin.manage_hospitals', 'Manage all hospitals', 'admin'),
('admin.view_audit_logs', 'View audit logs', 'admin'),
('admin.manage_roles', 'Manage roles and permissions', 'admin');

-- Assign permissions to roles
-- Patient role
INSERT INTO role_permission (role_id, permission_id)
SELECT 1, id FROM permission WHERE name IN (
  'user.view', 'patient.view', 'patient.update', 'doctor.view',
  'hospital.view', 'appointment.view', 'appointment.create', 'appointment.update',
  'appointment.cancel', 'report.view', 'report.upload', 'report.share',
  'review.create', 'review.view'
);

-- Doctor role
INSERT INTO role_permission (role_id, permission_id)
SELECT 2, id FROM permission WHERE name IN (
  'user.view', 'doctor.view', 'doctor.update', 'doctor.manage_schedule',
  'patient.view', 'hospital.view', 'appointment.view', 'appointment.update',
  'report.view', 'review.view', 'analytics.view'
);

-- Hospital Admin role
INSERT INTO role_permission (role_id, permission_id)
SELECT 3, id FROM permission WHERE name IN (
  'user.view', 'doctor.view', 'doctor.update', 'hospital.view',
  'hospital.update', 'hospital.manage_doctors', 'hospital.manage_departments',
  'appointment.view', 'analytics.view', 'analytics.export'
);

-- Super Admin role (all permissions)
INSERT INTO role_permission (role_id, permission_id)
SELECT 4, id FROM permission;

-- Insert default appointment statuses
INSERT INTO appointment_status (name, description, color) VALUES
('pending', 'Appointment is pending confirmation', '#F59E0B'),
('confirmed', 'Appointment is confirmed', '#10B981'),
('in_progress', 'Consultation in progress', '#3B82F6'),
('completed', 'Appointment completed', '#6B7280'),
('cancelled', 'Appointment cancelled', '#EF4444'),
('no_show', 'Patient did not show up', '#8B5CF6'),
('rescheduled', 'Appointment has been rescheduled', '#F97316');

-- Insert default specialties
INSERT INTO specialty (name, description, icon) VALUES
('General Medicine', 'General medical practice', '🏥'),
('Cardiology', 'Heart and cardiovascular system', '❤️'),
('Dermatology', 'Skin conditions and treatments', '🧴'),
('Orthopedics', 'Bones, joints, and muscles', '🦴'),
('Pediatrics', 'Children healthcare', '👶'),
('Neurology', 'Brain and nervous system', '🧠'),
('Ophthalmology', 'Eye care and surgery', '👁️'),
('ENT', 'Ear, Nose, and Throat', '👂'),
('Gynecology', 'Women reproductive health', '🩺'),
('Urology', 'Urinary tract system', '💊'),
('Psychiatry', 'Mental health', '🧘'),
('Dentistry', 'Dental and oral care', '🦷'),
('Radiology', 'Medical imaging', '📷'),
('Oncology', 'Cancer treatment', '🎗️'),
('Pulmonology', 'Lung and respiratory system', '🫁');
