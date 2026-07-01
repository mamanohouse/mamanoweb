document.addEventListener('DOMContentLoaded', async function() {
  if (!window.supabaseClient) return;

  const orderTrackerContainer = document.getElementById('order-tracker-container');
  const tableCustomersBody = document.getElementById('table-customers-body');
  const notifArea = document.getElementById('inline-notification');

  const showNotif = (msg, isError = false) => {
    notifArea.textContent = msg;
    notifArea.className = `container mt-sm text-center text-xs font-bold radius-sm p-sm ${isError ? 'btn-danger' : 'bg-light text-green border-dashed'}`;
    notifArea.classList.remove('hide-element');
    setTimeout(() => notifArea.classList.add('hide-element'), 5000);
  };

  window.supabaseClient.auth.onAuthStateChange((event, session) => {
    if (event === 'SIGNED_OUT' || !session) {
      window.location.href = 'login.html';
    }
  });

  const { data: { session } } = await window.supabaseClient.auth.getSession();
  if (!session) {
    window.location.href = 'login.html';
    return;
  }

  const userId = session.user.id;
  const userEmail = session.user.email;

  try {
    const { data: profile, error: profileError } = await window.supabaseClient
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (profileError) throw profileError;

    // Mengisi Detail Identitas Utuh
    document.getElementById('profile-name').textContent = profile.full_name || 'Tamu Warmth';
    document.getElementById('profile-email').textContent = userEmail || '—';
    document.getElementById('profile-whatsapp').textContent = profile.whatsapp || '—';
    document.getElementById('profile-job').textContent = profile.job || '—';
    document.getElementById('profile-address').textContent = profile.address || 'Belum ada alamat';
    document.getElementById('profile-rt').textContent = profile.rt || '-';
    document.getElementById('profile-rw').textContent = profile.rw || '-';
    document.getElementById('profile-ward').textContent = profile.ward || '-';
    document.getElementById('profile-subdistrict').textContent = profile.subdistrict || '-';
    document.getElementById('profile-postal').textContent = profile.postal_code || '-';
    
    let roleText = 'PELANGGAN';
    if (profile.role === 'sales') roleText = 'SALES PARTNER';
    if (profile.role === 'admin') roleText = 'ADMINISTRATOR';
    document.getElementById('user-role-badge').textContent = roleText;

    // Logika Khusus Sales Partner
    if (profile.role === 'sales') {
      document.getElementById('section-sales-dashboard').classList.remove('hide-element');
      document.getElementById('sales-ref-code').textContent = profile.referral_code || '-';

      // Mengambil data orders dan merelasikan ke order_items untuk menghitung Qty
      const { data: customersOrders, error: salesError } = await window.supabaseClient
        .from('orders')
        .select(`
          order_id, status,
          profiles!inner(id, full_name),
          order_items(qty)
        `)
        .eq('referral_code', profile.referral_code)
        .neq('user_id', profile.id); 

      if (salesError) {
        tableCustomersBody.innerHTML = '<tr><td colspan="4" class="p-sm text-center btn-danger">Gagal memuat data konsumen.</td></tr>';
      } else if (!customersOrders || customersOrders.length === 0) {
        tableCustomersBody.innerHTML = '<tr><td colspan="4" class="p-sm text-center text-muted">Belum ada konsumen yang menggunakan kode Anda.</td></tr>';
      } else {
        tableCustomersBody.innerHTML = ''; 
        let totalKomisi = 0;
        let countSuccess = 0;
        let countFailed = 0;

        customersOrders.forEach(order => {
          // Hitung total qty dari order_items
          let orderTotalQty = 0;
          if (order.order_items && order.order_items.length > 0) {
            orderTotalQty = order.order_items.reduce((sum, item) => sum + item.qty, 0);
          }

          if (order.status === 'completed') {
            totalKomisi += (orderTotalQty * 5000);
            countSuccess++;
          } else if (order.status === 'cancelled') {
            countFailed++;
          }

          const tr = document.createElement('tr');
          tr.className = 'border-top';
          
          const tdName = document.createElement('td');
          tdName.className = 'p-xs';
          tdName.textContent = order.profiles.full_name;
          
          const tdProduct = document.createElement('td');
          tdProduct.className = 'p-xs';
          tdProduct.textContent = 'Pashmina'; // Bisa dikembangkan dinamis nanti
          
          const tdQty = document.createElement('td');
          tdQty.className = 'p-xs text-center font-bold';
          tdQty.textContent = orderTotalQty;

          const tdStatus = document.createElement('td');
          tdStatus.className = 'p-xs text-center text-xs';
          // Format status teks untuk tabel agar lebih rapi (menghapus underscore)
          tdStatus.textContent = order.status.replace(/_/g, ' ').toUpperCase();

          tr.appendChild(tdName);
          tr.appendChild(tdProduct);
          tr.appendChild(tdQty);
          tr.appendChild(tdStatus);
          tableCustomersBody.appendChild(tr);
        });

        document.getElementById('stat-total-order').textContent = customersOrders.length;
        document.getElementById('stat-success-order').textContent = countSuccess;
        document.getElementById('stat-failed-order').textContent = countFailed;
        document.getElementById('stat-total-commission').textContent = 'Rp' + totalKomisi.toLocaleString('id-ID');
      }
    }

    // Mengambil Riwayat Pemesanan Komunitas (Pribadi) dengan relasi order_items
    const { data: myOrders, error: ordersError } = await window.supabaseClient
      .from('orders')
      .select(`
        *,
        order_items(
          color_id,
          qty,
          price,
          subtotal
        )
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (ordersError) {
      orderTrackerContainer.innerHTML = '<p class="text-danger text-sm text-center">Gagal memuat pesanan.</p>';
    } else if (!myOrders || myOrders.length === 0) {
      orderTrackerContainer.innerHTML = '<p class="text-muted text-sm text-center">Belum ada riwayat pesanan di bilik harapan.</p>';
    } else {
      orderTrackerContainer.innerHTML = '';
      
      const statusMap = {
        'waiting_target': 'Menunggu Target Kuota',
        'awaiting_dp': 'Menunggu Pembayaran DP',
        'production': 'Sedang Diproduksi',
        'awaiting_final_payment': 'Menunggu Pelunasan',
        'shipping': 'Sedang Dikirim',
        'completed': 'Selesai',
        'cancelled': 'Dibatalkan'
      };

      myOrders.forEach(order => {
        const orderCard = document.createElement('div');
        orderCard.className = 'p-sm border-dashed radius-sm bg-light flex-column gap-xs';
        
        const friendlyStatus = statusMap[order.status] || order.status;

        const idRow = document.createElement('div');
        idRow.className = 'font-bold text-sm text-green';
        idRow.textContent = `Pesanan: ${order.order_id}`;
        
        // Membangun detail teks dan total qty dari tabel order_items
        let orderTotalQty = 0;
        let detailText = [];
        
        if (order.order_items && order.order_items.length > 0) {
          order.order_items.forEach(item => {
            detailText.push(`${item.color_id} (${item.qty})`);
            orderTotalQty += item.qty;
          });
        }
        
        const detailRow = document.createElement('div');
        detailRow.className = 'text-xs text-secondary';
        detailRow.textContent = detailText.length > 0 ? detailText.join(', ') : 'Tidak ada item';

        const statRow = document.createElement('div');
        statRow.className = 'text-xs text-muted font-bold mt-xs border-top pt-xs';
        statRow.textContent = `Status: ${friendlyStatus} | Total: ${orderTotalQty} pcs`;

        orderCard.appendChild(idRow);
        orderCard.appendChild(detailRow);
        orderCard.appendChild(statRow);
        orderTrackerContainer.appendChild(orderCard);
      });
    }

  } catch (error) {
    showNotif("Terjadi kesalahan saat memuat data profil Anda.", true);
  }

  const logoutBtn = document.getElementById('btn-logout');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', async function() {
      showNotif("Menyiapkan kepulanganmu...");
      const { error } = await window.supabaseClient.auth.signOut();
      if (!error) {
        window.location.href = 'index.html';
      }
    });
  }
});
