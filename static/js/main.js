/* CoDiR project page — data-driven tables, ablation bars, theme, lightbox, BibTeX copy. */
(function () {
  'use strict';

  // ---------------------------------------------------------------------------
  // Data (Table 1–6 of the paper). Columns: [GlaS mDice, GlaS mJacc, CRAG mDice, CRAG mJacc]
  // ---------------------------------------------------------------------------
  const SOTA = Object.freeze({
    '10': [
      ['UAMT', "MICCAI'19", [78.57, 64.70, 77.85, 63.74]],
      ['FixMatch', "NeurIPS'20", [66.01, 51.39, 72.42, 64.31]],
      ['CPS', "CVPR'21", [61.70, 49.34, 47.10, 40.77]],
      ['CT', "MIDL'22", [81.75, 70.44, 77.33, 65.56]],
      ['XNet', "ICCV'23", [74.13, 58.90, 65.27, 50.40]],
      ['CorrMatch', "CVPR'24", [85.54, 74.74, 79.93, 66.76]],
      ['DuSSS', "AAAI'25", [75.07, 61.46, 64.25, 49.99]],
      ['CSDS', "MICCAI-W'25", [82.89, 71.61, 79.86, 67.81]],
      ['UniSemAlign', "CVPRW'26", [88.15, 78.82, 88.57, 79.52]],
      ['CoDiR (Ours)', '', [88.09, 79.41, 89.83, 82.46]],
    ],
    '20': [
      ['UAMT', "MICCAI'19", [77.09, 62.72, 79.76, 66.33]],
      ['FixMatch', "NeurIPS'20", [58.51, 44.12, 71.20, 64.75]],
      ['CPS', "CVPR'21", [75.99, 63.69, 52.43, 45.70]],
      ['CT', "MIDL'22", [85.96, 76.51, 81.64, 70.87]],
      ['XNet', "ICCV'23", [79.56, 67.50, 65.60, 50.85]],
      ['CorrMatch', "CVPR'24", [86.09, 75.59, 85.35, 74.54]],
      ['DuSSS', "AAAI'25", [79.50, 66.80, 71.13, 57.45]],
      ['CSDS', "MICCAI-W'25", [83.50, 72.87, 81.28, 69.67]],
      ['UniSemAlign', "CVPRW'26", [88.58, 79.50, 89.40, 80.88]],
      ['CoDiR (Ours)', '', [89.19, 81.09, 90.29, 82.93]],
    ],
  });

  // Each row: [label, mDice, std, mJaccard, std]. `min` sets the bar axis origin.
  const ABLATIONS = Object.freeze({
    modules: {
      min: 75,
      note: 'Diffusion refinement gives the largest gain (+6.36 mDice); confidence fusion and weighting add +0.78 together.',
      rows: [
        ['Mean Teacher (UNI + DeepLabV3)', 80.95, 0.12, 69.09, 0.79],
        ['+ Diffusion Refinement', 87.31, 0.26, 78.28, 0.40],
        ['+ Confidence Fusion', 87.50, 0.31, 78.54, 0.47],
        ['+ Confidence Weighting', 88.09, 0.32, 79.41, 0.46],
      ],
    },
    encoder: {
      min: 60,
      note: 'The pathology-specific UNI encoder beats general and other medical encoders by a wide margin.',
      rows: [
        ['ResNet101', 65.93, 0.15, 51.10, 0.13],
        ['ResNet200', 74.75, 0.10, 60.64, 0.11],
        ['MedCLIP', 72.65, 0.17, 58.47, 0.23],
        ['CONCH', 78.89, 0.04, 66.55, 0.14],
        ['UNI', 88.09, 0.32, 79.41, 0.46],
      ],
    },
    tau: {
      min: 86.5,
      note: 'τ_min = 0.60 fixed. Performance is stable across τ_max; 0.75 is used for training and inference.',
      rows: [
        ['τ_max = 0.70', 87.70, 0.05, 78.89, 0.16],
        ['τ_max = 0.75', 88.09, 0.32, 79.41, 0.46],
        ['τ_max = 0.80', 87.98, 0.39, 79.29, 0.62],
      ],
    },
    alpha: {
      min: 86.5,
      note: 'Moderate noise (α_n = 0.20) is best: too little cannot erase errors, too much destroys gland topology.',
      rows: [
        ['α_n = 0.05', 87.07, 0.09, 77.88, 0.14],
        ['α_n = 0.10', 87.98, 0.39, 79.29, 0.62],
        ['α_n = 0.20', 88.09, 0.32, 79.41, 0.46],
        ['α_n = 0.40', 87.61, 0.69, 78.67, 0.05],
        ['α_n = 0.60', 87.86, 0.38, 79.05, 0.33],
      ],
    },
    ema: {
      min: 86.5,
      note: 'Results are stable across EMA decay rates; d = 0.99 is used in all experiments.',
      rows: [
        ['d = 0.90', 87.65, 0.18, 78.78, 0.19],
        ['d = 0.99', 88.09, 0.32, 79.41, 0.46],
        ['d = 0.995', 87.22, 0.05, 78.14, 0.13],
        ['d = 0.999', 87.42, 0.06, 78.35, 0.13],
      ],
    },
  });

  const BAR_MAX = 90;

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------
  function el(tag, attrs, children) {
    const node = document.createElement(tag);
    Object.entries(attrs || {}).forEach(([k, v]) => {
      if (k === 'text') node.textContent = v;
      else if (k === 'style') node.style.cssText = v;
      else node.setAttribute(k, v);
    });
    (children || []).forEach((c) => node.appendChild(typeof c === 'string' ? document.createTextNode(c) : c));
    return node;
  }

  /** Returns, per column, the best and second-best value. */
  function rankColumns(rows) {
    return rows[0][2].map((_, col) => {
      const sorted = rows.map((r) => r[2][col]).sort((a, b) => b - a);
      return { best: sorted[0], second: sorted[1] };
    });
  }

  function activateTab(group, button) {
    group.querySelectorAll('.tab').forEach((t) => t.classList.toggle('active', t === button));
  }

  // ---------------------------------------------------------------------------
  // Table 1
  // ---------------------------------------------------------------------------
  function renderSota(split) {
    const table = document.getElementById('sota-table');
    if (!table) return;
    const rows = SOTA[split];
    const ranks = rankColumns(rows);
    const prevBest = rows[rows.length - 2][2]; // UniSemAlign — strongest competitor

    const head = el('thead', {}, [
      el('tr', {}, [
        el('th', { text: '' }),
        el('th', { colspan: '2', style: 'text-align:center', text: 'GlaS' }),
        el('th', { colspan: '2', style: 'text-align:center', text: 'CRAG' }),
      ]),
      el('tr', {}, ['Method', 'mDice (%)', 'mJaccard (%)', 'mDice (%)', 'mJaccard (%)'].map((t) => el('th', { text: t }))),
    ]);

    const body = el('tbody', {}, rows.map(([name, venue, vals], i) => {
      const isOurs = i === rows.length - 1;
      const nameCell = el('td', {}, [name, venue ? el('span', { class: 'venue-tag', text: `(${venue})` }) : '']);
      const valueCells = vals.map((v, col) => {
        const cls = v === ranks[col].best ? 'best' : v === ranks[col].second ? 'second' : '';
        const cell = el('td', { class: cls }, [v.toFixed(2)]);
        if (isOurs) {
          const d = v - prevBest[col];
          cell.appendChild(el('span', { class: 'delta', text: `${d >= 0 ? '+' : '−'}${Math.abs(d).toFixed(2)}` }));
        }
        return cell;
      });
      return el('tr', { class: isOurs ? 'ours' : '' }, [nameCell, ...valueCells]);
    }));

    table.replaceChildren(head, body);
  }

  // ---------------------------------------------------------------------------
  // Ablation bars
  // ---------------------------------------------------------------------------
  function renderAblation(key) {
    const box = document.getElementById('ablation-chart');
    const note = document.getElementById('ablation-note');
    const spec = ABLATIONS[key];
    if (!box || !spec) return;

    const top = Math.max(...spec.rows.map((r) => r[1]));
    const pct = (v) => Math.max(0, Math.min(100, ((v - spec.min) / (BAR_MAX - spec.min)) * 100));

    const header = el('div', { class: 'bar-row muted', style: 'font-size:12px' }, [
      el('span', { text: 'Configuration' }),
      el('span', { text: `mDice (%) · axis from ${spec.min}` }),
      el('span', { class: 'bar-val', text: 'mDice / mJaccard' }),
    ]);

    const rows = spec.rows.map(([label, dice, dStd, jac]) => {
      const fill = el('div', { class: 'bar-fill', style: `width:${pct(dice)}%` });
      const err = el('div', {
        class: 'bar-err',
        style: `left:${pct(dice - dStd)}%;width:${Math.max(pct(dice + dStd) - pct(dice - dStd), 0.4)}%`,
      });
      return el('div', { class: `bar-row${dice === top ? ' best' : ''}` }, [
        el('span', { text: label }),
        el('div', { class: 'bar-track' }, [fill, err]),
        el('span', { class: 'bar-val', text: `${dice.toFixed(2)} ± ${dStd.toFixed(2)} / ${jac.toFixed(2)}` }),
      ]);
    });

    box.replaceChildren(header, ...rows);
    note.textContent = spec.note;
  }

  // ---------------------------------------------------------------------------
  // Wiring
  // ---------------------------------------------------------------------------
  function initTabs() {
    document.querySelectorAll('.tabs').forEach((group) => {
      group.addEventListener('click', (e) => {
        const btn = e.target.closest('.tab');
        if (!btn) return;
        activateTab(group, btn);
        if (btn.dataset.split) renderSota(btn.dataset.split);
        if (btn.dataset.ab) renderAblation(btn.dataset.ab);
      });
    });
  }

  function initTheme() {
    const KEY = 'codir-theme';
    const root = document.documentElement;
    let saved = null;
    try { saved = localStorage.getItem(KEY); } catch (_) { /* storage disabled */ }
    const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    if (saved === 'dark' || (!saved && prefersDark)) root.setAttribute('data-theme', 'dark');

    const btn = document.getElementById('theme-toggle');
    if (!btn) return;
    btn.addEventListener('click', () => {
      const dark = root.getAttribute('data-theme') === 'dark';
      if (dark) root.removeAttribute('data-theme');
      else root.setAttribute('data-theme', 'dark');
      try { localStorage.setItem(KEY, dark ? 'light' : 'dark'); } catch (_) { /* storage disabled */ }
    });
  }

  function initLightbox() {
    const box = document.getElementById('lightbox');
    if (!box) return;
    const img = box.querySelector('img');
    const close = () => { box.hidden = true; };
    document.querySelectorAll('.zoomable img').forEach((src) => {
      src.addEventListener('click', () => {
        img.src = src.src;
        img.alt = src.alt;
        box.hidden = false;
      });
    });
    box.addEventListener('click', close);
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });
  }

  function initCopy() {
    const btn = document.getElementById('copy-bib');
    const pre = document.getElementById('bibtex');
    if (!btn || !pre) return;
    btn.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(pre.textContent);
        btn.textContent = 'Copied ✓';
      } catch (_) {
        const range = document.createRange();
        range.selectNodeContents(pre);
        const sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(range);
        btn.textContent = 'Press Ctrl+C';
      }
      setTimeout(() => { btn.textContent = 'Copy'; }, 1800);
    });
  }

  document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    initTabs();
    initLightbox();
    initCopy();
    renderSota('10');
    renderAblation('modules');
  });
})();
