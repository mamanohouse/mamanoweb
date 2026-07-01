document.addEventListener('DOMContentLoaded', function () {

  const registerForm = document.getElementById('form-register');
  const loginForm = document.getElementById('form-login');

  // ==========================================================
  // HELPER : GENERATE REFERRAL CODE UNIK
  // ==========================================================
  async function generateUniqueReferralCode() {
    let retries = 0;
    const maxRetries = 10;

    while (retries < maxRetries) {
      const randomNum = Math.floor(10000 + Math.random() * 90000);
      const code = `MMN-${randomNum}`;

      const { data, error } = await window.supabaseClient
        .from('profiles')
        .select('id')
        .eq('referral_code', code)
        .maybeSingle();

      if (error) {
        throw error;
      }

      if (!data) {
        return code;
      }

      retries++;
    }

    throw new Error('Gagal membuat kode referral unik.');
  }

  // ==========================================================
  // REGISTER
  // ==========================================================
  if (registerForm) {

    registerForm.addEventListener('submit', async function (e) {
      e.preventDefault();

      const errorMsg = document.getElementById('reg-error');
      const submitBtn = document.getElementById('btn-register-submit');

      errorMsg.style.display = 'none';

      const originalBtnText = submitBtn.textContent;
      submitBtn.textContent = 'Mendaftarkan...';
      submitBtn.disabled = true;

      const role = document.getElementById('reg-role').value;
      const name = document.getElementById('reg-name').value.trim();
      const dob = document.getElementById('reg-dob').value;
      const whatsapp = document.getElementById('reg-whatsapp').value.trim();
      const email = document.getElementById('reg-email').value.trim();
      const password = document.getElementById('reg-password').value;

      // =========================
      // VALIDASI FRONTEND
      // =========================
      if (password.length < 8) {
        errorMsg.textContent = "Kata sandi minimal 8 karakter ya.";
        errorMsg.style.display = 'block';
        submitBtn.textContent = originalBtnText;
        submitBtn.disabled = false;
        return;
      }

      if (!/^\d{10,15}$/.test(whatsapp)) {
        errorMsg.textContent = "Nomor WhatsApp harus berupa angka, minimal 10 digit dan maksimal 15 digit.";
        errorMsg.style.display = 'block';
        submitBtn.textContent = originalBtnText;
        submitBtn.disabled = false;
        return;
      }

      if (!window.supabaseClient) {
        errorMsg.textContent = "Koneksi database terputus. Coba muat ulang halaman ya.";
        errorMsg.style.display = 'block';
        submitBtn.textContent = originalBtnText;
        submitBtn.disabled = false;
        return;
      }

      try {

        // ==========================================================
        // CEK EMAIL & WHATSAPP DUPLIKAT
        // ==========================================================
        const { data: existingProfiles, error: checkError } =
          await window.supabaseClient
            .from('profiles')
            .select('email, whatsapp')
            .or(`email.eq.${email},whatsapp.eq.${whatsapp}`);

        if (checkError) throw checkError;

        if (existingProfiles && existingProfiles.length > 0) {

          const hasEmail = existingProfiles.some(
            p => p.email &&
            p.email.toLowerCase() === email.toLowerCase()
          );

          const hasWhatsapp = existingProfiles.some(
            p => p.whatsapp === whatsapp
          );

          if (hasEmail && hasWhatsapp) {
            errorMsg.textContent =
              "Maaf, Alamat Email dan Nomor WhatsApp ini sudah terdaftar.";
          }
          else if (hasEmail) {
            errorMsg.textContent =
              "Maaf, Alamat Email ini sudah terdaftar.";
          }
          else if (hasWhatsapp) {
            errorMsg.textContent =
              "Maaf, Nomor WhatsApp ini sudah terdaftar.";
          }

          errorMsg.style.display = 'block';
          return;
        }

        // ==========================================================
        // GENERATE REFERRAL HANYA UNTUK SALES
        // ==========================================================
        let referralCode = null;

        if (role === 'sales') {
          referralCode = await generateUniqueReferralCode();
        }

        // ==========================================================
        // REGISTER AUTH
        // ==========================================================
        const { data: authData, error: authError } =
          await window.supabaseClient.auth.signUp({
            email,
            password
          });

        if (authError) throw authError;

        if (!authData.user) {
          throw new Error('Gagal membuat akun.');
        }

        // ==========================================================
        // INSERT PROFILE
        // ==========================================================
        const { error: profileError } =
          await window.supabaseClient
            .from('profiles')
            .insert([{
              id: authData.user.id,
              email: email,
              role: role,
              full_name: name,
              dob: dob,
              whatsapp: whatsapp,
              referral_code: referralCode
            }]);

        if (profileError) throw profileError;

        alert(
          "Pendaftaran berhasil! Kunci rumahmu sudah aktif. Silakan masuk."
        );

        registerForm.reset();
        window.location.href = 'login.html';

      }
      catch (error) {

        errorMsg.textContent =
          "Maaf, terjadi kesalahan: " + error.message;

        errorMsg.style.display = 'block';
      }
      finally {

        submitBtn.textContent = originalBtnText;
        submitBtn.disabled = false;
      }
    });
  }

  // ==========================================================
  // LOGIN
  // ==========================================================
  if (loginForm) {

    loginForm.addEventListener('submit', async function (e) {
      e.preventDefault();

      const errorMsg = document.getElementById('login-error');
      const submitBtn = document.getElementById('btn-login-submit');

      if (errorMsg) {
        errorMsg.style.display = 'none';
      }

      const originalBtnText = submitBtn.textContent;
      submitBtn.textContent = 'Memasuki Rumah...';
      submitBtn.disabled = true;

      const email = document.getElementById('login-email').value.trim();
      const password = document.getElementById('login-password').value;

      if (!window.supabaseClient) {

        if (errorMsg) {
          errorMsg.textContent =
            "Koneksi database terputus. Coba muat ulang halaman ya.";
          errorMsg.style.display = 'block';
        }

        submitBtn.textContent = originalBtnText;
        submitBtn.disabled = false;
        return;
      }

      try {

        const { data, error } =
          await window.supabaseClient.auth.signInWithPassword({
            email,
            password
          });

        if (error) throw error;

        if (data.user) {
          window.location.href = 'index.html';
        }

      }
      catch (error) {

        if (errorMsg) {
          errorMsg.textContent =
            "Email atau kata sandi salah, silakan cek kembali ya.";
          errorMsg.style.display = 'block';
        }
      }
      finally {

        submitBtn.textContent = originalBtnText;
        submitBtn.disabled = false;
      }
    });
  }

  // ==========================================================
  // LOGOUT
  // ==========================================================
  const logoutBtn = document.getElementById('btn-logout');

  if (logoutBtn) {

    logoutBtn.addEventListener('click', async function () {

      if (!window.supabaseClient) return;

      try {

        const { error } =
          await window.supabaseClient.auth.signOut();

        if (error) throw error;

        window.location.href = 'index.html';

      }
      catch (error) {

        alert('Gagal keluar rumah: ' + error.message);
      }
    });
  }

  // ==========================================================
  // TOGGLE PASSWORD
  // ==========================================================
  const togglePasswordBtn =
    document.getElementById('btn-toggle-password');

  const loginPasswordInput =
    document.getElementById('login-password');

  if (togglePasswordBtn && loginPasswordInput) {

    togglePasswordBtn.addEventListener('click', function () {

      if (loginPasswordInput.type === 'password') {

        loginPasswordInput.type = 'text';
        togglePasswordBtn.textContent = 'Sembunyikan';

      } else {

        loginPasswordInput.type = 'password';
        togglePasswordBtn.textContent = 'Lihat';
      }
    });
  }

});
