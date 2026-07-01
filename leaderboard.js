document.addEventListener('DOMContentLoaded', async function() {
  const raceContainer = document.getElementById('colour-race-container');
  if (!raceContainer) return;

  if (!window.supabaseClient) {
    raceContainer.textContent = 'Koneksi database terputus. Gagal memuat arena balap.';
    return;
  }

  try {
    // 1. Ambil target minimum dinamis dari tabel color_race_targets
    let targetMinimum = 42; // Angka default jika terjadi kendala jaringan
    const { data: targetData } = await window.supabaseClient
      .from('color_race_targets')
      .select('target_minimum')
      .eq('is_active', true)
      .limit(1)
      .single();
    
    if (targetData && targetData.target_minimum) {
      targetMinimum = targetData.target_minimum;
    }

    // 2. Ambil metadata warna aktif dari tabel colors (Tidak ada hardcode lagi)
    const { data: colorsData, error: colorsError } = await window.supabaseClient
      .from('colors')
      .select('*')
      .eq('is_active', true);

    if (colorsError) throw colorsError;

    // 3. Ambil data akumulasi pesanan riil dari tabel color_race
    const { data: raceData, error: raceError } = await window.supabaseClient
      .from('color_race')
      .select('*');

    if (raceError) throw raceError;

    // Mapping total pesanan berdasarkan color_id agar mudah digabungkan
    const raceMap = {};
    if (raceData) {
      raceData.forEach(row => {
        raceMap[row.color_id] = row.total_orders;
      });
    }

    // 4. Gabungkan data dan hitung persentase
    const leaderboardData = colorsData.map(color => {
      const totalOrdered = raceMap[color.id] || 0;
      let percentage = (totalOrdered / targetMinimum) * 100;
      if (percentage > 100) percentage = 100; // Maksimal 100%
      
      return {
        id: color.id,
        name: color.name,
        group: color.color_group,
        hex: color.hex_code,
        total: totalOrdered,
        percentage: parseFloat(percentage.toFixed(1))
      };
    });

    // Urutkan berdasarkan yang paling laris (total terbanyak)
    leaderboardData.sort((a, b) => b.total - a.total);

    // 5. Render UI DOM (Dipertahankan 100% sama sesuai request)
    raceContainer.innerHTML = '';

    const groups = ['Natural', 'Nature', 'Coffee'];
    
    groups.forEach(groupName => {
      const groupSection = document.createElement('div');
      groupSection.className = 'mb-md';

      const groupTitle = document.createElement('h4');
      groupTitle.className = 'text-xs font-bold text-green mb-xs border-top pt-xs';
      groupTitle.textContent = `Kategori ${groupName}`;
      groupSection.appendChild(groupTitle);

      const groupWrapper = document.createElement('div');
      groupWrapper.className = 'd-flex flex-column gap-xs';

      const groupItems = leaderboardData.filter(item => item.group === groupName);

      groupItems.forEach(item => {
        const row = document.createElement('div');
        row.className = 'bg-light p-xs radius-sm border-dashed d-flex flex-column gap-xs';

        const labelDiv = document.createElement('div');
        labelDiv.className = 'd-flex justify-content-between align-items-center text-xs';

        const nameWrapper = document.createElement('div');
        nameWrapper.className = 'd-flex align-items-center gap-xs';

        const colorDot = document.createElement('span');
        colorDot.className = 'radius-sm';
        colorDot.style.width = '12px';
        colorDot.style.height = '12px';
        colorDot.style.display = 'inline-block';
        colorDot.style.border = '1px solid var(--color-border)';
        colorDot.style.backgroundColor = item.hex;

        const nameSpan = document.createElement('span');
        nameSpan.className = 'font-bold text-secondary';
        nameSpan.textContent = item.name;

        nameWrapper.appendChild(colorDot);
        nameWrapper.appendChild(nameSpan);

        const countSpan = document.createElement('span');
        countSpan.className = 'text-muted';
        countSpan.textContent = `${item.total} / ${targetMinimum} pcs (${item.percentage}%)`;

        labelDiv.appendChild(nameWrapper);
        labelDiv.appendChild(countSpan);

        const progressBg = document.createElement('div');
        progressBg.className = 'radius-sm';
        progressBg.style.width = '100%';
        progressBg.style.height = '8px';
        progressBg.style.backgroundColor = 'var(--color-border)';
        progressBg.style.overflow = 'hidden';

        const progressBar = document.createElement('div');
        progressBar.style.height = '100%';
        progressBar.style.width = `${item.percentage}%`;
        progressBar.style.backgroundColor = item.hex;
        progressBar.style.transition = 'width 0.5s var(--transition-smooth)';

        progressBg.appendChild(progressBar);
        row.appendChild(labelDiv);
        row.appendChild(progressBg);
        groupWrapper.appendChild(row);
      });

      groupSection.appendChild(groupWrapper);
      raceContainer.appendChild(groupSection);
    });

  } catch (err) {
    raceContainer.textContent = 'Gagal memproses data perlombaan warna.';
  }
});
