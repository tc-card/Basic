//function to render the contact form
export function renderProfileForm(profileEmail, formSubmitUrl) {
  return `
    <h3 class="text-xl font-semibold mb-6 text-white text-center">Contact Form</h3>
    <form id="contactForm" class="space-y-4" novalidate>
      <!-- Name Field -->
      <div>
        <input 
          type="text" 
          name="name" 
          placeholder="Your Name" 
          class="w-full px-4 py-3 bg-gray-700/50 text-white border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
          required
          minlength="2"
          maxlength="50"
        >
        <div class="text-red-400 text-sm mt-1 hidden">Please enter your name</div>
      </div>
      
      <!-- Email Field -->
      <div>
        <input 
          type="email" 
          name="email" 
          placeholder="Your Email" 
          class="w-full px-4 py-3 bg-gray-700/50 text-white border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
          required
        >
        <div class="text-red-400 text-sm mt-1 hidden">Please enter a valid email</div>
      </div>
      
      <!-- Phone Field -->
      <div>
        <input 
          type="tel" 
          name="phone" 
          placeholder="Your Phone (Optional)" 
          class="w-full px-4 py-3 bg-gray-700/50 text-white border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
        >
      </div>
      
      <!-- Message Field -->
      <div>
        <textarea 
          name="message" 
          placeholder="Your Message/Inquiry" 
          class="w-full px-4 py-3 bg-gray-700/50 text-white border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all min-h-[120px]"
          required
          minlength="10"
          maxlength="500"
        ></textarea>
        <div class="flex justify-between mt-1">
          <div class="text-red-400 text-sm hidden" data-error>Message must be 10-500 characters</div>
          <div class="text-xs text-gray-400" data-counter>0/500</div>
        </div>
      </div>
      
      <!-- Hidden Fields -->
      <input type="hidden" name="action" value="sendContactEmail">
      <input type="hidden" name="recipient" value="${escapeHtml(profileEmail)}">
      <input type="hidden" name="subject" value="New contact from your digital profile">
      
      <!-- Submit Button -->
      <button type="submit" class="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-800">
        Send Message
      </button>
    </form>
  `;
}

// Function to initialize form handling
export function initFormHandler(profileEmail, formSubmitUrl) {
  const form = document.getElementById("contactForm");
  
  if (!form) return;

  // Character counter setup
  const textarea = form.querySelector('textarea[name="message"]');
  const counter = form.querySelector("[data-counter]");
  const errorElement = form.querySelector("[data-error]");
  
  if (textarea && counter && errorElement) {
    textarea.addEventListener("input", function(e) {
      const length = e.target.value.length;
      counter.textContent = `${length}/500`;
      
      if (length > 500) {
        counter.style.color = "#f87171";
        errorElement.classList.remove("hidden");
      } else {
        counter.style.color = "rgba(255, 255, 255, 0.5)";
        errorElement.classList.add("hidden");
      }
    });
  }
  
  // Form submission handler
  form.addEventListener("submit", async function(e) {
    e.preventDefault();
    
    // Validate form
    const nameValid = form.name.value.trim().length >= 2;
    const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.value);
    const messageValid = form.message.value.trim().length >= 10;
    
    if (!nameValid || !emailValid || !messageValid) {
      Swal.fire({
        icon: "error",
        title: "Complete all fields properly",
        text: "• Name (2+ chars)\n• Valid email\n• Message (10+ chars)",
        background: "#1a1a1a",
      });
      return;
    }
    
    // Show loading state
    const submitBtn = form.querySelector('button[type="submit"]');
    const originalBtnText = submitBtn.innerHTML;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sending...';
    submitBtn.disabled = true;
    
    try {
      // Prepare URL parameters
      const params = new URLSearchParams();
      params.append("action", "sendContactEmail");
      params.append("name", form.name.value.trim());
      params.append("email", form.email.value.trim());
      params.append("phone", form.phone.value.trim() || "");
      params.append("message", form.message.value.trim());
      params.append("recipient", profileEmail);
      params.append("subject", `New message from ${form.name.value.trim()}`);
      params.append("profileUrl", window.location.href);
      
      // Submit via GET but using fetch() to prevent page reload
      const response = await fetch(`${formSubmitUrl}?${params.toString()}`);
      
      if (!response.ok) throw new Error("Server error");
      
      const result = await response.json();
      if (result.status !== "success") throw new Error(result.message);
      
      // Success handling
      form.reset();
      if (counter) counter.textContent = "0/500";
      
      Swal.fire({
        icon: "success",
        title: "Sent!",
        text: "Your message has been delivered",
        background: "#1a1a1a",
        timer: 2000
      });
    } catch (error) {
      Swal.fire({
        icon: "error",
        title: "Failed to send",
        text: error.message || "Please try again later",
        background: "#1a1a1a"
      });
    } finally {
      // Reset button state
      if (submitBtn) {
        submitBtn.innerHTML = originalBtnText;
        submitBtn.disabled = false;
      }
    }
  });
}

// XSS protection
function escapeHtml(unsafe) {
  if (typeof unsafe !== "string") return unsafe;
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}