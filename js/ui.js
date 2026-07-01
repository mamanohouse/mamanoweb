document.addEventListener('DOMContentLoaded', async function () {

  const triggerBtn = document.getElementById('btn-profile-trigger');
  const drawer = document.getElementById('profile-drawer');
  const overlay = document.getElementById('modal-overlay');
  const closeBtn = document.getElementById('drawer-close');
  const loginBtn = document.getElementById('btn-login-redirect');
  const profileTrigger = document.getElementById('btn-profile-trigger');

  // ==============================
  // CHECK LOGIN SESSION
  // ==============================
  async function checkAuthUI() {
    if (!window.supabaseClient) return;

    const { data: { session } } =
      await window.supabaseClient.auth.getSession();

    const orderBtn = document.getElementById('btn-order-redirect');

    if (session && session.user) {

      // USER LOGIN STATE
      if (loginBtn) loginBtn.style.display = 'none';
      if (profileTrigger) profileTrigger.classList.remove('hide-element');

      if (orderBtn) orderBtn.textContent = "Order (Logged In)";

    } else {

      // GUEST STATE
      if (loginBtn) loginBtn.style.display = 'inline-block';
      if (profileTrigger) profileTrigger.classList.add('hide-element');
    }
  }

  await checkAuthUI();

  // ==============================
  // SUPABASE AUTO UPDATE (REALTIME LOGIN CHANGE)
  // ==============================
  if (window.supabaseClient) {
    window.supabaseClient.auth.onAuthStateChange(() => {
      checkAuthUI();
    });
  }

  // ==============================
  // DRAWER UI (YOUR OLD CODE)
  // ==============================
  if (triggerBtn && drawer && overlay) {
    triggerBtn.addEventListener('click', function () {
      drawer.classList.add('active');
      overlay.classList.add('active');
    });
  }

  function closeDrawer() {
    if (drawer && overlay) {
      drawer.classList.remove('active');
      overlay.classList.remove('active');
    }
  }

  if (closeBtn) closeBtn.addEventListener('click', closeDrawer);
  if (overlay) overlay.addEventListener('click', closeDrawer);

  // ==============================
  // LOGOUT HANDLER
  // ==============================
  const logoutBtn = document.getElementById('btn-logout');

  if (logoutBtn) {
    logoutBtn.addEventListener('click', async function () {
      if (!window.supabaseClient) return;

      await window.supabaseClient.auth.signOut();
      window.location.href = 'index.html';
    });
  }

});
