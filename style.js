const docelem = document.documentElement;
//
// // rainbow background
// let hue = 202;
// setInterval(function(){
//   hue = (hue+1)%360;
//   document.documentElement.style.setProperty('--rainbow',  `${hue}, 70%, 60%`);
// }, 50);

// light/dark mode
let lightdarkmode = document.getElementById('lightdark');
lightdarkmode.addEventListener('click', function() {
  if (getComputedStyle(docelem).getPropertyValue('--bg-clr').trim() ===
      getComputedStyle(docelem).getPropertyValue('--bg-clr-dark').trim()) {
        docelem.style.setProperty('--bg-clr',  getComputedStyle(docelem).getPropertyValue('--bg-clr-light'));
        docelem.style.setProperty('--text-clr',  getComputedStyle(docelem).getPropertyValue('--text-clr-light'));
        lightdarkmode.innerHTML = '☀ Light Mode'; // ☽
  } else {
    docelem.style.setProperty('--bg-clr',  getComputedStyle(docelem).getPropertyValue('--bg-clr-dark'));
    docelem.style.setProperty('--text-clr',  getComputedStyle(docelem).getPropertyValue('--text-clr-dark'));
    lightdarkmode.innerHTML = '🌔 Dark Mode'; // ☼  ❂
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
