const docelem = document.documentElement;

// light/dark mode
let lightdarkmode = document.getElementById('lightdark');
lightdarkmode.addEventListener('click', function() {
  if (getComputedStyle(docelem).getPropertyValue('--bg-clr').trim() ===
      getComputedStyle(docelem).getPropertyValue('--bg-clr-dark').trim()) {
        docelem.style.setProperty('--bg-clr',  getComputedStyle(docelem).getPropertyValue('--bg-clr-light'));
        docelem.style.setProperty('--text-clr',  getComputedStyle(docelem).getPropertyValue('--text-clr-light'));
        lightdarkmode.innerHTML = '<img src="sun.svg"/> Light Mode'; // ☽
  } else {
    docelem.style.setProperty('--bg-clr',  getComputedStyle(docelem).getPropertyValue('--bg-clr-dark'));
    docelem.style.setProperty('--text-clr',  getComputedStyle(docelem).getPropertyValue('--text-clr-dark'));
    lightdarkmode.innerHTML = '<img src="moon.svg"/> Dark Mode'; // ☼  ❂  🌔
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
