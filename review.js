document.addEventListener('DOMContentLoaded', async function() {
  const reviewsContainer = document.getElementById('reviews-container');
  const reviewFormContainer = document.getElementById('review-form-container');
  const loginPromptContainer = document.getElementById('login-prompt-container');
  const reviewForm = document.getElementById('form-review');
  const reviewerNameDisplay = document.getElementById('reviewer-name-display');
  const statAvgRating = document.getElementById('stat-avg-rating');
  const statTotalReviews = document.getElementById('stat-total-reviews');
  const reviewStats = document.getElementById('review-stats');
  const charCount = document.getElementById('char-count');
  const reviewComment = document.getElementById('review-comment');
  const btnSubmitReview = document.getElementById('btn-submit-review');
  const formReviewTitle = document.getElementById('form-review-title');
  const reviewIdInput = document.getElementById('review-id');

  if (!window.supabaseClient) {
    if (reviewsContainer) {
      reviewsContainer.textContent = 'Koneksi database terputus.';
    }
    return;
  }

  let currentUserProfile = null;
  let userExistingReviewId = null;

  const { data: { session } } = await window.supabaseClient.auth.getSession();
  
  if (session) {
    const { data: profile } = await window.supabaseClient
      .from('profiles')
      .select('full_name')
      .eq('id', session.user.id)
      .single();
      
    if (profile) {
      currentUserProfile = profile;
      reviewerNameDisplay.textContent = profile.full_name;
      reviewFormContainer.classList.remove('hide-element');
    }
  } else {
    loginPromptContainer.classList.remove('hide-element');
  }

  if (reviewComment) {
    reviewComment.addEventListener('input', function() {
      charCount.textContent = this.value.length;
    });
  }

  async function loadReviews() {
    try {
      const { data: reviews, error } = await window.supabaseClient
        .from('reviews')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (reviewsContainer) {
        reviewsContainer.innerHTML = '';
        
        if (reviews.length === 0) {
          reviewsContainer.innerHTML = '<div class="card p-md text-center bg-light border-dashed text-muted text-sm">Belum ada kisah yang dibagikan. Jadilah bagian pertama dari perjalanan MAMANO House.</div>';
          reviewStats.classList.add('hide-element');
          return;
        }

        reviewStats.classList.remove('hide-element');
        let totalScore = 0;
        
        reviews.forEach(review => {
          totalScore += review.rating;

          if (currentUserProfile && review.name === currentUserProfile.full_name) {
            userExistingReviewId = review.id;
            reviewIdInput.value = review.id;
            document.getElementById('review-rating').value = review.rating;
            reviewComment.value = review.comment;
            charCount.textContent = review.comment.length;
            btnSubmitReview.textContent = 'Update Ulasan Saya';
            formReviewTitle.textContent = 'Ulasan Anda';
          }

          const card = document.createElement('div');
          card.className = 'card p-sm bg-light border-dashed mb-xs flex-column gap-xs';
          
          const headerDiv = document.createElement('div');
          headerDiv.className = 'd-flex justify-content-between align-items-center border-bottom pb-xs';
          
          const authorDiv = document.createElement('div');
          
          const nameStrong = document.createElement('strong');
          nameStrong.className = 'text-sm text-secondary font-bold';
          nameStrong.textContent = review.name;
          
          const dateSpan = document.createElement('span');
          dateSpan.className = 'text-muted text-xs block';
          const reviewDate = new Date(review.created_at);
          dateSpan.textContent = reviewDate.toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' });
          
          authorDiv.appendChild(nameStrong);
          authorDiv.appendChild(dateSpan);
          
          const starsDiv = document.createElement('div');
          starsDiv.className = 'text-gold text-sm';
          let stars = '';
          for (let i = 1; i <= 5; i++) {
            stars += i <= review.rating ? '★' : '☆';
          }
          starsDiv.textContent = stars;
          
          headerDiv.appendChild(authorDiv);
          headerDiv.appendChild(starsDiv);
          
          const commentP = document.createElement('p');
          commentP.className = 'text-sm text-secondary mt-xs';
          commentP.textContent = review.comment;
          
          card.appendChild(headerDiv);
          card.appendChild(commentP);
          reviewsContainer.appendChild(card);
        });

        const avgRating = (totalScore / reviews.length).toFixed(1);
        statAvgRating.innerHTML = `${avgRating} <span class="text-sm text-muted font-normal">/ 5</span>`;
        statTotalReviews.textContent = `Berdasarkan ${reviews.length} kisah pelanggan`;
      }
    } catch (err) {
      if (reviewsContainer) {
        reviewsContainer.innerHTML = '<div class="text-center btn-danger p-sm radius-sm text-xs">Gagal memuat ulasan.</div>';
      }
    }
  }

  await loadReviews();

  if (reviewForm) {
    reviewForm.addEventListener('submit', async function(e) {
      e.preventDefault();

      const errorMsg = document.getElementById('review-error-message');
      const successMsg = document.getElementById('review-success-message');
      
      errorMsg.style.display = 'none';
      successMsg.style.display = 'none';

      const ratingInput = parseInt(document.getElementById('review-rating').value);
      const commentInput = reviewComment.value.trim();

      if (commentInput.length < 10) {
        errorMsg.textContent = "Untaian kesan terlalu pendek. Minimal 10 karakter ya.";
        errorMsg.style.display = 'block';
        return;
      }

      if (commentInput.length > 500) {
        errorMsg.textContent = "Untaian kesan terlalu panjang. Maksimal 500 karakter ya.";
        errorMsg.style.display = 'block';
        return;
      }

      const originalBtnText = btnSubmitReview.textContent;
      btnSubmitReview.textContent = 'Menyimpan...';
      btnSubmitReview.disabled = true;

      try {
        if (userExistingReviewId) {
          const { error } = await window.supabaseClient
            .from('reviews')
            .update({
              rating: ratingInput,
              comment: commentInput
            })
            .eq('id', userExistingReviewId);

          if (error) throw error;
          successMsg.textContent = "Kisah hangat Anda berhasil diperbarui.";
        } else {
          const { error } = await window.supabaseClient
            .from('reviews')
            .insert([{
              name: currentUserProfile.full_name,
              rating: ratingInput,
              comment: commentInput
            }]);

          if (error) throw error;
          successMsg.textContent = "Terima kasih! Kisah hangat Anda berhasil dibagikan.";
        }

        successMsg.style.display = 'block';
        await loadReviews();
        
        setTimeout(() => {
          successMsg.style.display = 'none';
        }, 5000);

      } catch (err) {
        errorMsg.textContent = err.message || "Terjadi kesalahan saat menyimpan ulasan.";
        errorMsg.style.display = 'block';
      } finally {
        btnSubmitReview.textContent = originalBtnText;
        btnSubmitReview.disabled = false;
      }
    });
  }
});
