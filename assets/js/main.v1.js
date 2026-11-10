
(function () {
  'use strict';
  var WA = 'https://wa.me/375333414155';
  var INS = { good: { w: 60, name: 'хорошее' }, mid: { w: 100, name: 'среднее' }, bad: { w: 140, name: 'слабое' } };
  var SYS = { boiler: 'электрокотёл + радиаторы', conv: 'конвекторы', floor: 'тёплый пол' };
  var BOILERS = [6, 9, 12, 15, 18, 24, 30, 36];
  var CONV = [0.5, 0.7, 1.0, 1.25, 1.5, 2.0, 2.5];
  var BREAKERS = [16, 20, 25, 32, 40, 50, 63, 80, 100, 125];
  var CABLES = [[16, 1.5], [25, 2.5], [32, 4], [40, 6], [50, 10], [63, 16], [80, 25], [100, 35], [125, 50]];

  function initDrawer() {
    var d = document.getElementById('drawer');
    var b = document.querySelector('.header .burger');
    if (!d || !b) return;
    var last = null;
    function open() {
      last = document.activeElement;
      d.hidden = false; d.setAttribute('data-open', '');
      b.setAttribute('aria-expanded', 'true');
      document.body.classList.add('is-locked');
      var f = d.querySelector('a, button'); if (f) f.focus({ preventScroll: true });
    }
    function close() {
      d.hidden = true; d.removeAttribute('data-open');
      b.setAttribute('aria-expanded', 'false');
      document.body.classList.remove('is-locked');
      if (last) last.focus({ preventScroll: true });
    }
    b.addEventListener('click', function () { d.hidden ? open() : close(); });
    d.addEventListener('click', function (e) {
      if (e.target.closest('[data-close]') || e.target.closest('a') || !e.target.closest('.drawer__in')) close();
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && !d.hidden) close();
      if (e.key === 'Tab' && !d.hidden) {
        var it = d.querySelectorAll('a, button, input');
        if (!it.length) return;
        var f = it[0], l = it[it.length - 1];
        if (e.shiftKey && document.activeElement === f) { e.preventDefault(); l.focus(); }
        else if (!e.shiftKey && document.activeElement === l) { e.preventDefault(); f.focus(); }
      }
    });
    window.addEventListener('resize', function () { if (window.innerWidth > 1024 && !d.hidden) close(); });
  }

  function initCalc() {
    var box = document.getElementById('oP');
    if (!box) return;
    var st = { s: 120, h: 2.7, ins: 'mid', sys: 'boiler', rooms: 5, phase: '1' };
    var o = {
      P: document.getElementById('oP'), I: document.getElementById('oI'), plabel: document.getElementById('oPlabel'),
      spec: document.getElementById('oSpec'), f: document.getElementById('oFormula'),
      go: document.getElementById('oGo'),
      vS: document.getElementById('vS'), vH: document.getElementById('vH'), vR: document.getElementById('vR')
    };
    function m(v) { return String(Math.round(v * 10) / 10).replace('.', ','); }
    function single(id, key) {
      var b = document.getElementById(id); if (!b) return;
      b.addEventListener('click', function (e) {
        var btn = e.target.closest('button'); if (!btn || !b.contains(btn)) return;
        st[key] = btn.getAttribute('data-v');
        [].forEach.call(b.children, function (c) { c.setAttribute('aria-pressed', c === btn ? 'true' : 'false'); });
        draw();
      });
    }
    function draw() {
      var vol = st.s * st.h;
      var k = INS[st.ins].w;
      var qIndex = Math.min(1.25, Math.max(0.85, st.h / 2.7));
      var raw = (st.s * k * qIndex) / 1000;
      var P = Math.ceil(raw * 2) / 2;
      if (P < 1) P = 1;
      var pFloor = Math.round(st.s * 0.7 * 0.14 * 10) / 10;
      var Pdev = st.sys === 'floor' ? pFloor : P;
      var I = st.phase === '3' ? (Pdev * 1000) / (1.732 * 380) : (Pdev * 1000) / 220;
      I = Math.round(I * 10) / 10;
      var breaker = null, cable = null;
      for (var i = 0; i < BREAKERS.length; i++) { if (BREAKERS[i] >= I * 1.1) { breaker = BREAKERS[i]; break; } }
      if (!breaker) breaker = 125;
      for (var c = 0; c < CABLES.length; c++) { if (CABLES[c][0] >= breaker) { cable = CABLES[c][1]; break; } }
      if (!cable) cable = 50;

      var rows = [];
      rows.push(['Объём помещения', m(vol) + ' м³']);
      rows.push(['Удельные теплопотери', k + ' Вт/м²']);
      rows.push(['Расчётная мощность', m(P) + ' кВт']);
      if (st.sys === 'boiler') {
        var bt = BOILERS.filter(function (b) { return b >= P; })[0] || 36;
        rows.push(['Ближайший котёл', bt + ' кВт']);
        rows.push(['Запас по мощности', m(bt - P) + ' кВт']);
      } else if (st.sys === 'conv') {
        var per = P / st.rooms;
        var units = 1, one = 2.5;
        if (per <= 2.5) {
          one = CONV.filter(function (v) { return v >= per; })[0] || 2.5;
        } else {
          units = Math.ceil(per / 2.5);
        }
        rows.push(['На комнату', m(per) + ' кВт']);
        rows.push(['Конвекторы на комнату', units + ' шт. по ' + m(one) + ' кВт']);
        rows.push(['Всего приборов', (st.rooms * units) + ' шт.']);
        rows.push(['Суммарно с запасом', m(st.rooms * units * one) + ' кВт']);
      } else {
        var heated = st.s * 0.7;
        rows.push(['Площадь обогрева', m(heated) + ' м²']);
        rows.push(['Мощность пола', m(pFloor) + ' кВт']);
        rows.push(['Покрывает потребность', Math.round(pFloor / P * 100) + ' %']);
        rows.push(['Кабель/мат', Math.round(heated * 0.14 / 0.15) + ' м²']);
      }
      rows.push(['Ток нагрузки', m(I) + ' А']);
      rows.push(['Автомат (ориентир)', breaker + ' А']);
      rows.push(['Кабель медь, ВВГнг', cable + ' мм²']);
      if (st.sys !== 'floor') rows.push(['Групп в щите', (st.sys === 'conv' ? st.rooms : 1) + ' на отопление']);

      o.spec.innerHTML = rows.map(function (r) { return '<tr><td>' + r[0] + '</td><td>' + r[1] + '</td></tr>'; }).join('');
      o.P.textContent = m(Pdev) + ' кВт';
      o.plabel.textContent = st.sys === 'floor' ? 'мощность пола' : 'расчётная мощность';
      o.I.textContent = m(I) + ' А';
      o.vS.textContent = st.s + ' м²'; o.vH.textContent = m(st.h) + ' м'; o.vR.textContent = st.rooms;
      var fTxt = 'P = S × ' + k + ' Вт/м² × ' + m(qIndex) + ' (поправка на высоту) = ' + m(P) + ' кВт | I = ' + (st.phase === '3' ? 'P / (√3 × 380)' : 'P / 220') + ' = ' + m(I) + ' А';
      if (st.sys === 'floor' && pFloor < P) {
        fTxt += ' | пол при 140 Вт/м² даёт ' + m(pFloor) + ' кВт, то есть ' + Math.round(pFloor / P * 100) + '% потребности: как единственное отопление не хватит, нужен второй источник.';
      }
      if (st.phase === '1' && I > 40) {
        fTxt += ' | Внимание: однофазный ввод на ' + m(I) + ' А — редкость. Для такой мощности обычно нужен ввод 380 В, иначе выделенной мощности не хватит.';
      }
      o.f.textContent = fTxt;
      o.go.href = WA + '?text=' + encodeURIComponent(
        'Заявка с сайта (расчёт отопления).\nПлощадь: ' + st.s + ' м²\nВысота: ' + m(st.h) + ' м' +
        '\nУтепление: ' + INS[st.ins].name + '\nСистема: ' + SYS[st.sys] +
        (st.sys === 'conv' ? '\nКомнат: ' + st.rooms : '') +
        '\nВвод: ' + (st.phase === '3' ? '380 В' : '220 В') +
        '\nРасчёт: ' + m(P) + ' кВт, ' + m(I) + ' А, автомат ' + breaker + ' А, кабель ' + cable + ' мм²' +
        '\n\nПодскажите, что ещё учесть. Пришлю фото щита и ТУ.');
    }
    single('cIns', 'ins'); single('cSys', 'sys'); single('cPhase', 'phase');
    var cS = document.getElementById('cS'), cH = document.getElementById('cH'), cR = document.getElementById('cR');
    if (cS) cS.addEventListener('input', function () { st.s = parseInt(cS.value, 10); draw(); });
    if (cH) cH.addEventListener('input', function () { st.h = parseFloat(cH.value); draw(); });
    if (cR) cR.addEventListener('input', function () { st.rooms = parseInt(cR.value, 10); draw(); });
    draw();
  }

  function initDocs() {
    var box = document.getElementById('docs');
    if (!box) return;
    var fill = document.getElementById('docFill'), cnt = document.getElementById('docCount'), go = document.getElementById('docGo');
    var all = box.querySelectorAll('input');
    function upd() {
      var have = [], miss = [];
      [].forEach.call(all, function (i) { (i.checked ? have : miss).push(i.value); });
      var p = Math.round(have.length / all.length * 100);
      fill.style.width = p + '%';
      cnt.textContent = have.length + ' из ' + all.length;
      go.href = WA + '?text=' + encodeURIComponent(
        'Заявка с сайта: документы для Энергонадзора.\nЕсть: ' + (have.length ? have.join(', ') : 'ничего') +
        '\nНет: ' + (miss.length ? miss.join(', ') : 'всё есть') +
        '\n\nПодскажите, что нужно в моём случае и в каком порядке собирать.');
    }
    box.addEventListener('change', upd);
    upd();
  }

  function initLead() {
    var f = document.getElementById('lead');
    if (!f) return;
    f.addEventListener('submit', function (e) {
      e.preventDefault();
      var n = document.getElementById('lName'), t = document.getElementById('lTel');
      var obj = document.getElementById('lObj'), city = document.getElementById('lCity'), task = document.getElementById('lTask');
      var bad = false;
      [n, t].forEach(function (el) {
        if (!el.value.trim()) { el.style.borderColor = '#B2601F'; bad = true; } else { el.style.borderColor = ''; }
      });
      if (bad) return;
      var msg = 'Заявка с сайта: электрика и отопление.\nИмя: ' + n.value.trim() + '\nТелефон: ' + t.value.trim() +
        (obj && obj.value.trim() ? '\nОбъект: ' + obj.value.trim() : '') +
        (city && city.value.trim() ? '\nГород: ' + city.value.trim() : '') +
        (task && task.value.trim() ? '\nЗадача: ' + task.value.trim() : '') +
        '\n\nФото прикреплю следом.';
      window.open(WA + '?text=' + encodeURIComponent(msg), '_blank');
    });
  }

  document.addEventListener('DOMContentLoaded', function () {
    initDrawer(); initCalc(); initDocs(); initLead();
    var y = document.getElementById('yr'); if (y) y.textContent = new Date().getFullYear();
  });
})();
