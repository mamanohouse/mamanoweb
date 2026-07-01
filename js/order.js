document.addEventListener('DOMContentLoaded', async function() {
  const orderForm = document.getElementById('form-order');
  if (!orderForm) return;

  // 1. Pastikan pengunjung sudah masuk
  if (!window.supabaseClient) return;
  const { data: { session } } = await window.supabaseClient.auth.getSession();
  
  if (!session) {
    alert("Keluarga MAMANO yang terhormat, silakan masuk (login) terlebih dahulu ya sebelum memilih warna.");
    window.location.href = 'login.html';
    return;
  }

  const user = session.user;
  const { data: profile } = await window.supabaseClient
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  orderForm.addEventListener('submit', async function(e) {
    e.preventDefault();

    const errorMsg = document.getElementById('order-error');
    errorMsg.style.display = 'none';

    // 2. Kumpulkan warna dan kuantitas
    const items = {};
    let totalQty = 0;
    const colorInputs = document.querySelectorAll('.color-input');
    
    colorInputs.forEach(input => {
      const qty = parseInt(input.value) || 0;
      if (qty > 0) {
        items[input.getAttribute('data-color')] = qty;
        totalQty += qty;
      }
    });

    if (totalQty === 0) {
      errorMsg.textContent = "Pilih minimal 1 pashmina favoritmu, ya.";
      errorMsg.style.display = 'block';
      return;
    }

    // Peringatan Ramah Pesanan Besar
    if (totalQty > 50) {
      const proceed = confirm("Wah, pesananmu banyak sekali! (>50 pcs). Persediaan bahan baku kami mungkin membutuhkan waktu produksi sedikit lebih lama. Apakah kamu ingin tetap melanjutkan?");
      if (!proceed) return;
    }

    // 3. Hitung Harga & Diskon
    const pricePerItem = 128000;
    const refCode = document.getElementById('order-referral').value.trim();
    let discountPerItem = 0;

    if (refCode) {
      if (profile && profile.role === 'sales' && refCode === profile.referral_code) {
        discountPerItem = 5000;
      } else {
        const { data: refOwner } = await window.supabaseClient
          .from('profiles')
          .select('id')
          .eq('referral_code', refCode)
          .single();

        if (refOwner) {
          discountPerItem = 3000;
        } else {
          errorMsg.textContent = "Maaf, Kode Referral tersebut tidak ditemukan di sistem kami.";
          errorMsg.style.display = 'block';
          return;
        }
      }
    }

    const netPricePerItem = pricePerItem - discountPerItem;
    const totalPrice = netPricePerItem * totalQty;
    const address = document.getElementById('order-address').value.trim();

    // 4. Bangun Pop-out Nota Konfirmasi
    const modal = document.getElementById('custom-confirm-modal');
    const invoiceContent = document.getElementById('confirm-invoice-content');
    
    let itemsHTML = '';
    for (const [color, qty] of Object.entries(items)) {
      itemsHTML += `
        <div class="mt-xs">MMNH-PASHMINA ${color} [${qty}]</div>
        <div class="text-muted text-xs">Rp ${netPricePerItem.toLocaleString('id-ID')}</div>
      `;
    }

    invoiceContent.innerHTML = `
      <p><strong>Nama pemesan:</strong><br>${profile ? profile.full_name : 'Tamu Warmth'}</p>
      <p><strong>Alamat Lengkap:</strong><br>${address}</p>
      <div class="border-top mt-sm pt-xs">
        <strong>Pesanan:</strong>
        ${itemsHTML}
      </div>
      <p class="mt-sm"><strong>Kode referal:</strong><br>${refCode || '(tidak ada)'}</p>
      <div class="border-top mt-xs pt-sm text-green font-bold text-md">
        <strong>Total:</strong> Rp ${totalPrice.toLocaleString('id-ID')}
      </div>
    `;

    // Tampilkan Modal
    modal.classList.add('active');

    // 5. Aksi Tombol Modal
    const btnCancel = document.getElementById('btn-confirm-no');
    const btnConfirm = document.getElementById('btn-confirm-yes');

    // Hapus event listener lama supaya tidak menumpuk saat klik batal lalu klik submit lagi
    btnCancel.onclick = function() {
      modal.classList.remove('active');
    };

    btnConfirm.onclick = async function() {
      modal.classList.remove('active');
      
      const submitBtn = document.getElementById('btn-submit-order');
      const originalBtnText = submitBtn.textContent;
      submitBtn.textContent = 'Mencatat Harapanmu...';
      submitBtn.disabled = true;

      try {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let randomPart = '';
        for (let i = 0; i < 6; i++) {
          randomPart += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        const orderId = 'MMNH-' + randomPart;

        const { error: insertError } = await window.supabaseClient.from('orders').insert([{
          order_id: orderId,
          user_id: user.id,
          items_detail: items,
          total_qty: totalQty,
          referral_code: refCode || null,
          discount_per_item: discountPerItem,
          shipping_address: address,
          status: 'pending'
        }]);

        if (insertError) throw insertError;

        alert("Terimakasih sudah memesan, silahkan menunggu konfirmasi dari kami.\nMAMANO HOUSE.");
        orderForm.reset();
        window.location.href = 'profile.html';

      } catch (error) {
        errorMsg.textContent = error.message;
        errorMsg.style.display = 'block';
      } finally {
        submitBtn.textContent = originalBtnText;
        submitBtn.disabled = false;
      }
    };
  });
});
