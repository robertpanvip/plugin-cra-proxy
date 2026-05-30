import './index.css?a=123';

document.querySelector('#app').innerHTML = `
<div class="content">
  <h1>Vanilla vite</h1>
  <p>Start building amazing things with vite.</p>
</div>
`;

setTimeout(() => {
  fetch('/api/user');
}, 1000);
