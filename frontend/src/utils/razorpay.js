const RAZORPAY_SCRIPT = 'https://checkout.razorpay.com/v1/checkout.js';

let scriptPromise = null;

function loadScript() {
  if (typeof window === 'undefined') return Promise.resolve(false);
  if (window.Razorpay) return Promise.resolve(true);
  if (scriptPromise) return scriptPromise;
  scriptPromise = new Promise((resolve) => {
    const s = document.createElement('script');
    s.src = RAZORPAY_SCRIPT;
    s.async = true;
    s.onload = () => resolve(!!window.Razorpay);
    s.onerror = () => { scriptPromise = null; resolve(false); };
    document.body.appendChild(s);
  });
  return scriptPromise;
}

export async function openRazorpayCheckout(order, user) {
  const loaded = await loadScript();
  if (!loaded || !window.Razorpay) {
    throw new Error('Unable to load the Razorpay checkout. Please check your connection and try again.');
  }
  const key = import.meta.env.VITE_RAZORPAY_KEY_ID || order.key_id;
  return new Promise((resolve) => {
    let settled = false;
    const options = {
      key,
      amount: order.amount,
      currency: order.currency || 'INR',
      name: order.name || 'Left2Serve',
      description: order.description || 'Food reservation payment',
      order_id: order.razorpay_order_id,
      prefill: {
        name: user?.name || (order.prefill && order.prefill.name) || '',
        email: user?.email || (order.prefill && order.prefill.email) || '',
        contact: user?.phone || (order.prefill && order.prefill.contact) || ''
      },
      theme: { color: '#DC2626' },
      handler: (response) => { settled = true; resolve(response); },
      modal: { ondismiss: () => { if (!settled) resolve(null); } }
    };
    const rzp = new window.Razorpay(options);
    rzp.on('payment.failed', () => {});
    rzp.open();
  });
}
