(() => {
  const form = document.querySelector('#news-form');
  const button = form.querySelector('button');
  const status = document.querySelector('#news-feedback');
  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (button.disabled || !form.reportValidity()) return;
    status.textContent = '';
    status.removeAttribute('data-error');
    button.disabled = true;
    form.setAttribute('aria-busy','true');
    try {
      const response = await fetch('/api/newsletter', {
        method: 'POST',
        headers: {'Content-Type':'application/json'},
        body: JSON.stringify({email:form.elements.email.value, consent:form.elements.consent.checked})
      });
      const result = await response.json();
      if (!response.ok || result.subscribed !== true) throw new Error(result.error || 'Signups are temporarily unavailable.');
      form.reset();
      status.textContent = 'You’re on the list. Thank you for signing up.';
    } catch (error) {
      status.setAttribute('data-error','');
      status.textContent = error instanceof TypeError || error instanceof SyntaxError ? 'We couldn’t save your signup. Please try again.' : error.message;
    } finally {
      form.removeAttribute('aria-busy');
      button.disabled = false;
    }
  });
})();
