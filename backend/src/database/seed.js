const bcrypt = require('bcrypt');
const pool = require('./connection');

async function seed() {
  try {
    console.log('🌱 Starting database seeding...');

    // Create Super Admin user
    const hashedPassword = await bcrypt.hash('Admin@123', 12);

    const [existingAdmin] = await pool.query(
      'SELECT id FROM user WHERE email = ?',
      ['admin@healthcare.com']
    );

    if (existingAdmin.length === 0) {
      const [userResult] = await pool.query(
        `INSERT INTO user (email, password_hash, first_name, last_name, phone, is_active, is_verified)
         VALUES (?, ?, ?, ?, ?, TRUE, TRUE)`,
        ['admin@healthcare.com', hashedPassword, 'Super', 'Admin', '9999999999']
      );

      await pool.query(
        'INSERT INTO user_role (user_id, role_id) VALUES (?, ?)',
        [userResult.insertId, 4] // super_admin role
      );

      console.log('✅ Super Admin created: admin@healthcare.com / Admin@123');
    } else {
      console.log('ℹ️  Super Admin already exists');
    }

    // Create sample hospitals
    const hospitals = [
      {
        name: 'Apollo Hospital',
        description: 'Multi-specialty hospital providing world-class healthcare services.',
        email: 'info@apollo.com',
        phone: '1800-599-0099',
        city: 'Mumbai',
        state: 'Maharashtra',
        address_line1: 'Plot No 13, Parsik Hill Road',
        lat: 19.0760,
        lng: 72.8777,
        bed_count: 500,
      },
      {
        name: 'Fortis Healthcare',
        description: 'Leading integrated healthcare delivery service provider.',
        email: 'info@fortis.com',
        phone: '1800-419-1122',
        city: 'Delhi',
        state: 'Delhi',
        address_line1: 'Sector B, Pocket 1, Aruna Asaf Ali Marg',
        lat: 28.5672,
        lng: 77.2100,
        bed_count: 350,
      },
      {
        name: 'Max Super Speciality Hospital',
        description: 'Providing expert care in various medical specialties.',
        email: 'info@maxhealthcare.com',
        phone: '1800-102-6299',
        city: 'Bangalore',
        state: 'Karnataka',
        address_line1: 'Outer Ring Road, Marathahalli',
        lat: 12.9716,
        lng: 77.5946,
        bed_count: 400,
      },
      {
        name: 'Medanta - The Medicity',
        description: 'A prestigious institution of international repute.',
        email: 'info@medanta.org',
        phone: '1800-102-6262',
        city: 'Gurugram',
        state: 'Haryana',
        address_line1: 'CH Baktawar Singh Road, Sector 38',
        lat: 28.4428,
        lng: 77.0419,
        bed_count: 600,
      },
      {
        name: 'AIIMS',
        description: 'All India Institute of Medical Sciences - premier medical institution.',
        email: 'info@aiims.edu',
        phone: '011-26588500',
        city: 'New Delhi',
        state: 'Delhi',
        address_line1: 'Sri Aurobindo Marg, Ansari Nagar',
        lat: 28.5672,
        lng: 77.2100,
        bed_count: 2500,
      },
    ];

    for (const h of hospitals) {
      const [existing] = await pool.query('SELECT id FROM hospital WHERE name = ?', [h.name]);
      if (existing.length === 0) {
        const [result] = await pool.query(
          `INSERT INTO hospital (name, description, email, phone, address_line1, city, state, bed_count, is_active, is_verified)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, TRUE, TRUE)`,
          [h.name, h.description, h.email, h.phone, h.address_line1, h.city, h.state, h.bed_count]
        );

        await pool.query(
          `INSERT INTO hospital_location (hospital_id, latitude, longitude, formatted_address)
           VALUES (?, ?, ?, ?)`,
          [result.insertId, h.lat, h.lng, `${h.address_line1}, ${h.city}, ${h.state}`]
        );
      }
    }
    console.log('✅ Sample hospitals created');

    // Create sample doctors
    const doctors = [
      { first: 'Rahul', last: 'Sharma', email: 'dr.rahul@healthcare.com', specialty: 1, qual: 'MBBS, MD - General Medicine', exp: 12, fee: 500 },
      { first: 'Priya', last: 'Patel', email: 'dr.priya@healthcare.com', specialty: 2, qual: 'MBBS, DM - Cardiology', exp: 15, fee: 800 },
      { first: 'Amit', last: 'Kumar', email: 'dr.amit@healthcare.com', specialty: 4, qual: 'MBBS, MS - Orthopedics', exp: 10, fee: 700 },
      { first: 'Sneha', last: 'Reddy', email: 'dr.sneha@healthcare.com', specialty: 5, qual: 'MBBS, MD - Pediatrics', exp: 8, fee: 600 },
      { first: 'Vikram', last: 'Singh', email: 'dr.vikram@healthcare.com', specialty: 6, qual: 'MBBS, DM - Neurology', exp: 18, fee: 1000 },
    ];

    for (let i = 0; i < doctors.length; i++) {
      const d = doctors[i];
      const [existing] = await pool.query('SELECT id FROM user WHERE email = ?', [d.email]);
      if (existing.length === 0) {
        const hash = await bcrypt.hash('Doctor@123', 12);
        const [userRes] = await pool.query(
          `INSERT INTO user (email, password_hash, first_name, last_name, is_active, is_verified)
           VALUES (?, ?, ?, ?, TRUE, TRUE)`,
          [d.email, hash, d.first, d.last]
        );

        await pool.query('INSERT INTO user_role (user_id, role_id) VALUES (?, ?)', [userRes.insertId, 2]);

        const hospitalId = (i % 5) + 1;
        const [docRes] = await pool.query(
          `INSERT INTO doctor (user_id, hospital_id, license_number, qualification, experience_years, consultation_fee, is_available)
           VALUES (?, ?, ?, ?, ?, ?, TRUE)`,
          [userRes.insertId, hospitalId, `LIC-${1000 + i}`, d.qual, d.exp, d.fee]
        );

        await pool.query(
          'INSERT INTO doctor_specialty (doctor_id, specialty_id, is_primary) VALUES (?, ?, TRUE)',
          [docRes.insertId, d.specialty]
        );

        // Create availability slots (Mon-Fri 9am-5pm)
        for (let day = 1; day <= 5; day++) {
          await pool.query(
            `INSERT INTO availability_slot (doctor_id, day_of_week, start_time, end_time, slot_duration, is_active)
             VALUES (?, ?, '09:00:00', '13:00:00', 30, TRUE)`,
            [docRes.insertId, day]
          );
          await pool.query(
            `INSERT INTO availability_slot (doctor_id, day_of_week, start_time, end_time, slot_duration, is_active)
             VALUES (?, ?, '14:00:00', '17:00:00', 30, TRUE)`,
            [docRes.insertId, day]
          );
        }
      }
    }
    console.log('✅ Sample doctors created');

    // Create sample patient
    const [existingPatient] = await pool.query('SELECT id FROM user WHERE email = ?', ['patient@healthcare.com']);
    if (existingPatient.length === 0) {
      const patientHash = await bcrypt.hash('Patient@123', 12);
      const [patientUser] = await pool.query(
        `INSERT INTO user (email, password_hash, first_name, last_name, phone, date_of_birth, gender, is_active, is_verified)
         VALUES (?, ?, ?, ?, ?, ?, ?, TRUE, TRUE)`,
        ['patient@healthcare.com', patientHash, 'John', 'Doe', '9876543210', '1990-05-15', 'male']
      );

      await pool.query('INSERT INTO user_role (user_id, role_id) VALUES (?, ?)', [patientUser.insertId, 1]);
      await pool.query(
        `INSERT INTO patient (user_id, blood_group, emergency_contact_name, emergency_contact_phone)
         VALUES (?, ?, ?, ?)`,
        [patientUser.insertId, 'O+', 'Jane Doe', '9876543211']
      );
      console.log('✅ Sample patient created: patient@healthcare.com / Patient@123');
    }

    // Create sample hospital admin
    const [existingHAdmin] = await pool.query('SELECT id FROM user WHERE email = ?', ['hadmin@apollo.com']);
    if (existingHAdmin.length === 0) {
      const hAdminHash = await bcrypt.hash('HAdmin@123', 12);
      const [hAdminUser] = await pool.query(
        `INSERT INTO user (email, password_hash, first_name, last_name, phone, is_active, is_verified)
         VALUES (?, ?, ?, ?, ?, TRUE, TRUE)`,
        ['hadmin@apollo.com', hAdminHash, 'Apollo', 'Admin', '8888888888']
      );

      await pool.query('INSERT INTO user_role (user_id, role_id) VALUES (?, ?)', [hAdminUser.insertId, 3]); // hospital_admin role

      // Assuming Apollo Hospital is ID 1 (it's the first one inserted)
      const [hospital] = await pool.query('SELECT id FROM hospital WHERE name = ?', ['Apollo Hospital']);
      if (hospital.length > 0) {
        await pool.query(
          `INSERT INTO hospital_admin (user_id, hospital_id, designation)
           VALUES (?, ?, ?)`,
          [hAdminUser.insertId, hospital[0].id, 'Chief Administrator']
        );
      }
      console.log('✅ Sample hospital admin created: hadmin@apollo.com / HAdmin@123');
    }

    console.log('\n🎉 Database seeding completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Seeding failed:', error.message);
    process.exit(1);
  }
}

seed();
