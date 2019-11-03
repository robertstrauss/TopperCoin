const docelem = document.documentElement;

// rainbow background
let hue = 120;
setInterval(function(){
  hue = (hue+1)%360;
  document.documentElement.style.setProperty('--rainbow',  `hsl(${hue}, 70%, 60%)`);
}, 50);

// light/dark mode
let lightdarkmode = document.getElementById('lightdark');
lightdarkmode.addEventListener('click', function() {
  if (getComputedStyle(docelem).getPropertyValue('--cell-bg').trim() ===
      getComputedStyle(docelem).getPropertyValue('--cell-bg-dark').trim()) {
        docelem.style.setProperty('--cell-bg',  getComputedStyle(docelem).getPropertyValue('--cell-bg-light'));
        docelem.style.setProperty('--text-clr',  getComputedStyle(docelem).getPropertyValue('--text-clr-light'));
        lightdarkmode.innerHTML = '🌔'; // ☽
  } else {
    docelem.style.setProperty('--cell-bg',  getComputedStyle(docelem).getPropertyValue('--cell-bg-dark'));
    docelem.style.setProperty('--text-clr',  getComputedStyle(docelem).getPropertyValue('--text-clr-dark'));
    lightdarkmode.innerHTML = '☀'; // ☼  ❂
  }
});

// modals
const query = document.querySelectorAll.bind(document);

let modalRoot = query('.modal');
let modals = query('.modal-content');

modalRoot.forEach(modalr => modalr.addEventListener('click', function () {
  modalr.style.display = 'none';
}));

modals.forEach(modal => modal.addEventListener('click', function (e) {
  e.preventDefault();
  e.stopPropagation();
  e.stopImmediatePropagation();
  return false;
}));
