async function test() {
  try {
    const res = await fetch('http://localhost:5000/api/users?limit=50', {
      headers: {
        Cookie: 'refresh_token=placeholder'
      }
    });
    const text = await res.text();
    console.log("Status:", res.status);
    console.log("Response:", text);
  } catch (e) {
    console.error(e.message);
  }
}
test();
