const pool = require('./src/database/connection');

(async () => {
  try {
    // Find doctor Digvijaysinh
    const [doc] = await pool.query("SELECT d.id, u.first_name, u.last_name FROM doctor d JOIN user u ON d.user_id = u.id WHERE u.first_name LIKE '%digvijay%' OR u.last_name LIKE '%vansiya%'");
    console.log('Doctor:', JSON.stringify(doc, null, 2));
    
    if (doc.length > 0) {
      const doctorId = doc[0].id;
      
      // Check appointments
      const [appts] = await pool.query('SELECT DISTINCT a.patient_id, u.first_name, u.last_name FROM appointment a JOIN patient p ON a.patient_id = p.id JOIN user u ON p.user_id = u.id WHERE a.doctor_id = ?', [doctorId]);
      console.log('\nAppointment patients:', JSON.stringify(appts, null, 2));
      
      // Check report_access
      const [access] = await pool.query('SELECT ra.*, mr.title as report_title FROM report_access ra JOIN medical_report mr ON ra.report_id = mr.id WHERE ra.doctor_id = ? AND ra.is_revoked = FALSE', [doctorId]);
      console.log('\nReport access entries:', JSON.stringify(access, null, 2));
      
      // Check what getMyPatients would return
      const where = '(a.doctor_id = ? OR (ra.doctor_id = ? AND ra.is_revoked = FALSE))';
      const params = [doctorId, doctorId];
      const [patients] = await pool.query(
        `SELECT DISTINCT p.id, p.status, u.first_name, u.last_name
         FROM patient p
         JOIN user u ON p.user_id = u.id
         LEFT JOIN appointment a ON a.patient_id = p.id
         LEFT JOIN medical_report mr ON mr.patient_id = p.id
         LEFT JOIN report_access ra ON ra.report_id = mr.id
         WHERE ${where}`,
        params
      );
      console.log('\ngetMyPatients result:', JSON.stringify(patients, null, 2));
    }
    
    // Also check patient Kakshil
    const [kakshil] = await pool.query("SELECT p.id as patient_id, u.id as user_id, u.first_name, u.last_name FROM patient p JOIN user u ON p.user_id = u.id WHERE u.first_name LIKE '%kakshil%'");
    console.log('\nPatient Kakshil:', JSON.stringify(kakshil, null, 2));
    
    // Check all reports by Kakshil
    if (kakshil.length > 0) {
      const [reports] = await pool.query('SELECT id, title, patient_id FROM medical_report WHERE patient_id = ?', [kakshil[0].patient_id]);
      console.log('\nKakshil reports:', JSON.stringify(reports, null, 2));
    }
    
    process.exit(0);
  } catch (e) {
    console.error('Error:', e.message);
    process.exit(1);
  }
})();
