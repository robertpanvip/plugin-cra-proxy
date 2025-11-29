import './index.css';

document.querySelector('#app').innerHTML = `
<div class="content">
  <h1>Vanilla vite</h1>
  <p>Start building amazing things with vite.</p>
</div>
`;

setTimeout(() => {
  fetch('/a');
}, 1000);
