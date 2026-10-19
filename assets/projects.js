/* Project stories and photography, including offline preview support. */
(function () {
  'use strict';
  var snapshot = window.tenDContent;
  var projects = {};
  var dialog = document.getElementById('photo-dialog');
  var activeKey = null;
  var returnHash = '#portfolio';
  var lastFocus = null;
  var pushedProject = false;
  var previousOverflow = '';
  var defaultTitle = document.title;

  // Relative paths work on Cloudflare and when opening index.html on a computer.
  function safeImage(value) {
    if (typeof value !== 'string' || !value.trim()) return null;
    var trimmed = value.trim();
    if (/^\/?images\//.test(trimmed)) {
      var local = trimmed.replace(/^\//, '');
      if (local.split(/[\\/]/).some(function (part) { return part === '..'; })) return null;
      return local;
    }
    try { var url = new URL(trimmed); return url.protocol === 'https:' ? url.href : null; }
    catch (error) { return null; }
  }

  function setPhoto(img, value) {
    var url = safeImage(value);
    if (!url || img.getAttribute('src') === url) return;
    var previous = img.getAttribute('src');
    img.addEventListener('error', function () {
      if (previous && img.getAttribute('src') === url) img.src = previous;
    }, { once: true });
    img.src = url;
  }

  function applyToAll(attribute, key, url) {
    document.querySelectorAll('[' + attribute + ']').forEach(function (img) {
      if (img.getAttribute(attribute) === key) setPhoto(img, url);
    });
  }

  async function readSource(source) {
    var response = await fetch(source, { cache: 'no-cache' });
    if (!response.ok) throw new Error(source);
    var text = (await response.text()).replace(/^\uFEFF/, '');
    var match = text.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/);
    if (!match || !window.jsyaml) throw new Error('Invalid content: ' + source);
    var data = window.jsyaml.load(match[1], { schema: window.jsyaml.JSON_SCHEMA }) || {};
    data.body = text.slice(match[0].length).trim();
    return data;
  }

  function create(tag, className, value) {
    var element = document.createElement(tag);
    if (className) element.className = className;
    if (value != null) element.textContent = value;
    return element;
  }

  function syncBlogIllustrations(id, data) {
    var article = document.getElementById('article-' + id);
    var body = article && article.querySelector('.article-body');
    if (!body || !Array.isArray(data.illustrations)) return;
    var specs = data.illustrations.map(function (item, index) {
      if (!item || typeof item !== 'object') return null;
      var url = safeImage(item.image);
      if (!url) return null;
      return { key: item.key || 'image-' + (index + 1), url: url,
        heading: String(item.after_heading || '').trim(),
        alt: String(item.alt || item.caption || ''), caption: String(item.caption || item.alt || '') };
    }).filter(Boolean);
    var current = Array.from(body.querySelectorAll('img[data-blog-illustration]'));
    if (current.length === specs.length && current.every(function (img, index) {
      var spec = specs[index], figure = img.closest('figure');
      var caption = figure && figure.querySelector('figcaption');
      return img.getAttribute('data-blog-illustration') === id + ':' + spec.key &&
        img.getAttribute('src') === spec.url && img.alt === spec.alt && figure && caption &&
        figure.getAttribute('data-after-heading') === spec.heading && caption.textContent === spec.caption;
    })) return;
    body.querySelectorAll('img[data-blog-illustration],img[data-blog-inline]').forEach(function (img) {
      var figure = img.closest('figure'); if (figure) figure.remove();
    });
    specs.forEach(function (spec, index) {
      var figure = create('figure', 'article-photo blog-illustration');
      figure.setAttribute('data-after-heading', spec.heading);
      var img = create('img'); img.src = spec.url; img.alt = spec.alt;
      img.loading = article.classList.contains('active') ? 'eager' : 'lazy'; img.decoding = 'async';
      img.setAttribute('data-blog-illustration', id + ':' + spec.key);
      if (index === 0) img.setAttribute('data-blog-inline', id);
      img.addEventListener('error', function () {
        var fallback = safeImage(data.thumbnail);
        if (fallback && img.getAttribute('src') !== fallback) img.src = fallback;
      }, { once: true });
      figure.append(img, create('figcaption', '', spec.caption));
      var heading = Array.from(body.querySelectorAll('h2,h3')).find(function (element) {
        return element.textContent.replace(/\s+/g, ' ').trim() === spec.heading;
      });
      if (heading) heading.after(figure);
      else {
        var cta = body.querySelector('.article-cta');
        if (cta) cta.before(figure); else body.appendChild(figure);
      }
    });
  }

  // Render story formatting as text nodes, keeping CMS HTML out of the page.
  function inlineText(element, text) {
    String(text).split(/(\*\*[^*]+\*\*)/g).forEach(function (part) {
      if (/^\*\*[^*]+\*\*$/.test(part)) element.appendChild(create('strong', '', part.slice(2, -2)));
      else element.appendChild(document.createTextNode(part));
    });
  }

  function renderStory(container, body) {
    String(body || '').split(/\n\s*\n/).filter(Boolean).forEach(function (block) {
      var heading = block.match(/^#{1,6}\s+(.+)$/);
      if (heading) container.appendChild(create('h4', '', heading[1]));
      else if (block.split('\n').every(function (line) { return /^[-*]\s+/.test(line); })) {
        var list = create('ul');
        block.split('\n').forEach(function (line) {
          var item = create('li'); inlineText(item, line.replace(/^[-*]\s+/, '')); list.appendChild(item);
        });
        container.appendChild(list);
      } else {
        var paragraph = create('p'); inlineText(paragraph, block.replace(/\n/g, ' ')); container.appendChild(paragraph);
      }
    });
  }

  function updateProject(key, data) {
    var project = projects[key];
    project.details = Object.assign({}, project.details, data);
    project.title = project.details.title || project.title;
    var gallery = Array.isArray(data.gallery) ? data.gallery.map(function (item) {
      return safeImage(typeof item === 'string' ? item : item && item.image);
    }).filter(Boolean) : [];
    var cover = safeImage(project.details.thumbnail);
    if (!gallery.length && cover) gallery.push(cover);
    if (gallery.length) project.gallery = gallery.filter(function (url, i, all) { return all.indexOf(url) === i; });
    if (cover) applyToAll('data-project-cover', key, cover);
    document.querySelectorAll('[data-project-key="' + key + '"]').forEach(function (link) {
      link.hidden = project.details.visible === false;
      link.setAttribute('aria-label', 'Xem dự án ' + project.title);
      var title = link.querySelector('.pi-name');
      if (title) title.textContent = project.title;
    });
    if (key === 'ocean-park') document.querySelectorAll('[data-featured-gallery]').forEach(function (img) {
      var url = project.gallery[Number(img.getAttribute('data-featured-gallery'))];
      img.parentElement.hidden = !url;
      if (url) setPhoto(img, url);
    });
    if (activeKey === key && dialog.open) {
      if (project.details.visible === false) closeGallery();
      else renderProject(key);
    }
  }

  function renderProject(key) {
    var project = projects[key], data = project.details;
    document.getElementById('photo-dialog-title').textContent = project.title;
    document.getElementById('photo-dialog-kicker').textContent = [data.style, data.property_type].filter(Boolean).join(' · ');
    document.getElementById('photo-dialog-location').textContent = [data.location, data.building].filter(Boolean).join(' · ');
    var cover = document.getElementById('photo-project-cover');
    setPhoto(cover, project.gallery[0]); cover.alt = project.alt;
    var stats = dialog.querySelector('.photo-project-stats'); stats.replaceChildren();
    [
      ['Diện tích', data.area ? data.area + ' m²' : ''], ['Phòng ngủ', data.bedrooms],
      ['Phong cách', data.style], ['Loại hình', data.property_type],
      ['Thi công', data.duration > 0 ? data.duration + ' ngày' : ''], ['Năm hoàn thiện', data.year],
      ['Mục đích', data.purpose], ['Giá thuê', data.rental_price > 0 ? data.rental_price + ' triệu/tháng' : '']
    ].forEach(function (pair) {
      if (!pair[1]) return;
      var cell = create('div'); cell.append(create('dt', '', pair[0]), create('dd', '', pair[1])); stats.appendChild(cell);
    });
    var story = dialog.querySelector('.photo-project-story'); story.replaceChildren(); renderStory(story, data.body);
    var grid = dialog.querySelector('.photo-dialog-grid'); grid.replaceChildren();
    project.gallery.forEach(function (url, index) {
      var figure = create('figure'), img = create('img');
      img.src = url;
      img.alt = project.gallery.length === 1 ? project.alt : project.title + ' — góc nhìn ' + (index + 1);
      img.decoding = 'async'; img.loading = 'lazy';
      figure.append(img, create('figcaption', '', project.gallery.length === 1 ? project.title : 'Góc nhìn ' + String(index + 1).padStart(2, '0')));
      grid.appendChild(figure);
    });
    document.getElementById('photo-gallery-count').textContent = project.gallery.length + ' ảnh';
    document.getElementById('photo-project-link').href = '#project-' + key;
    document.getElementById('photo-project-link').textContent = 'Sao chép đường dẫn ↗';
    document.title = project.title + ' | tenD';
  }

  function openGallery(key, pushRoute) {
    var project = projects[key];
    if (!project || !dialog || project.details.visible === false) return;
    if (!dialog.open) {
      lastFocus = document.activeElement;
      returnHash = location.hash.indexOf('#project-') === 0 ? '#portfolio' : location.hash;
      previousOverflow = document.body.style.overflow;
    }
    activeKey = key; renderProject(key);
    if (pushRoute && location.hash !== '#project-' + key) {
      history.pushState({ project: key }, '', '#project-' + key); pushedProject = true;
    }
    document.body.style.overflow = 'hidden';
    if (!dialog.open) dialog.showModal();
    dialog.scrollTop = 0;
    document.getElementById('photo-dialog-title').focus({ preventScroll: true });
  }

  function hideGallery() {
    if (!dialog || !dialog.open) return;
    activeKey = null; dialog.close();
    document.body.style.overflow = previousOverflow; document.title = defaultTitle;
    if (lastFocus && lastFocus.isConnected) lastFocus.focus({ preventScroll: true });
  }

  function closeGallery() {
    if (!dialog.open) return;
    hideGallery();
    if (location.hash.indexOf('#project-') === 0) {
      if (pushedProject) { pushedProject = false; history.back(); }
      else history.replaceState(null, '', location.pathname + location.search + (returnHash || ''));
    }
  }

  function wireProject(element, key) {
    if (!element) return;
    var link = create('a');
    Array.from(element.attributes).forEach(function (attribute) {
      if (['onclick', 'role', 'tabindex'].indexOf(attribute.name) < 0) link.setAttribute(attribute.name, attribute.value);
    });
    link.href = '#project-' + key; link.setAttribute('data-project-key', key);
    link.setAttribute('aria-label', 'Xem dự án ' + projects[key].title);
    while (element.firstChild) link.appendChild(element.firstChild);
    element.replaceWith(link);
    link.addEventListener('click', function (event) {
      if (event.button || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      event.preventDefault(); openGallery(key, true);
    });
  }

  snapshot.sources.projects.forEach(function (source) {
    var data = snapshot.projects[source.key] || {};
    projects[source.key] = { title: data.title || source.key, alt: source.alt, gallery: source.gallery.map(safeImage).filter(Boolean), details: data };
    var cover = document.querySelector('[data-img-id="img-project-' + source.key + '"]');
    document.querySelectorAll('[data-project-key="' + source.key + '"]').forEach(function (element) { wireProject(element, source.key); });
    if (cover) wireProject(cover.closest('.portfolio-item'), source.key);
    updateProject(source.key, data);
  });

  if (dialog) {
    dialog.querySelector('.photo-close').addEventListener('click', closeGallery);
    dialog.addEventListener('cancel', function (event) { event.preventDefault(); closeGallery(); });
    dialog.addEventListener('click', function (event) {
      if (event.target !== dialog) return;
      var rect = dialog.getBoundingClientRect();
      if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) closeGallery();
    });
    dialog.querySelector('.photo-consult').addEventListener('click', function () {
      hideGallery(); pushedProject = false; navigateTo('home'); document.getElementById('s6').scrollIntoView({ behavior: 'smooth' });
    });
    document.getElementById('photo-project-link').addEventListener('click', function (event) {
      event.preventDefault(); var link = this;
      if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(location.href).then(function () { link.textContent = 'Đã sao chép đường dẫn ✓'; })
          .catch(function () { link.textContent = 'Đường dẫn ở thanh địa chỉ ↑'; });
      } else link.textContent = 'Đường dẫn ở thanh địa chỉ ↑';
    });
  }

  document.querySelectorAll('[data-featured-gallery]').forEach(function (img) {
    img.tabIndex = 0; img.setAttribute('role', 'button');
    img.setAttribute('aria-label', 'Xem chi tiết và bộ ảnh Vinhomes Ocean Park');
    img.addEventListener('click', function () { openGallery('ocean-park', true); });
    img.addEventListener('keydown', function (event) {
      if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); openGallery('ocean-park', true); }
    });
  });
  var portfolioLink = document.querySelector('#s5 .s5-header a');
  if (portfolioLink) {
    portfolioLink.href = '#portfolio';
    portfolioLink.addEventListener('click', function (event) { event.preventDefault(); navigateTo('portfolio'); });
  }
  var footerProjects = { 'Ocean Park': 'ocean-park', 'Smart City': 'smart-city', 'Grand Park': 'grand-park', 'Royal City': 'royal-city', 'Metropolis': 'metropolis' };
  document.querySelectorAll('footer a[href="#"]').forEach(function (link) {
    var key = footerProjects[link.textContent.trim()];
    if (!key) return;
    link.href = '#project-' + key;
    link.addEventListener('click', function (event) {
      if (event.button || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      event.preventDefault(); openGallery(key, true);
    });
  });

  function restoreRoute() {
    var hash = location.hash.slice(1), key = hash.indexOf('project-') === 0 ? hash.slice(8) : null;
    if (key && projects[key] && projects[key].details.visible !== false) {
      if (!dialog.open) navigateTo('portfolio', { history: false });
      openGallery(key, false); return;
    }
    hideGallery(); pushedProject = false;
    if (hash.indexOf('article-') === 0 && document.getElementById(hash)) {
      navigateTo('blog', { history: false }); showBlogArticle(hash.slice(8), { history: false });
    } else if (document.getElementById('page-' + hash)) navigateTo(hash, { history: false });
    else {
      navigateTo('home', { history: false });
      var section = document.getElementById(hash); if (section) section.scrollIntoView();
    }
  }
  window.addEventListener('popstate', restoreRoute);
  window.addEventListener('hashchange', restoreRoute);
  restoreRoute();

  var tasks = [];
  if (location.protocol !== 'file:') {
    tasks.push(fetch('data/visuals.json', { cache: 'no-cache' }).then(function (response) {
      if (!response.ok) throw new Error('visuals'); return response.json();
    }).then(function (data) {
      (data.slots || []).forEach(function (slot) {
        document.querySelectorAll('[data-visual-slot]').forEach(function (img) {
          if (img.getAttribute('data-visual-slot') === slot.key) {
            setPhoto(img, slot.image); if (typeof slot.alt === 'string') img.alt = slot.alt;
          }
        });
      });
    }));
    snapshot.sources.projects.forEach(function (source) {
      tasks.push(readSource(source.source).then(function (data) { updateProject(source.key, data); }));
    });
    snapshot.sources.blogs.forEach(function (blog) {
      tasks.push(readSource(blog.source).then(function (data) {
        if (data.thumbnail) applyToAll('data-blog-cover', blog.id, data.thumbnail);
        if (!Array.isArray(data.illustrations) && data.inline_image) applyToAll('data-blog-inline', blog.id, data.inline_image);
        syncBlogIllustrations(blog.id, data);
      }));
    });
  }
  window.tenDImagesReady = Promise.allSettled(tasks).then(function (results) {
    var failures = results.filter(function (result) { return result.status === 'rejected'; });
    if (failures.length) console.warn('tenD: ' + failures.length + ' nguồn chưa tải được; đang dùng nội dung có sẵn.');
    return results;
  });
})();
