window.pageContentReady = (async () => {
  try {
    const response = await fetch('/api/content', { cache: 'no-store', signal: AbortSignal.timeout(8000) });
    if (!response.ok) throw new Error('Content unavailable');
    const content = await response.json();
    if (typeof content.title !== 'string' || typeof content.body !== 'string') throw new Error('Invalid content');
    document.title = content.title + ' | Everyday Atlas';
    document.querySelector('h1').textContent = content.title;
    document.querySelector('.intro').textContent = content.intro || '';
    document.querySelector('.eyebrow').textContent = content.category || 'Everyday discoveries';
    document.querySelector('.meta').textContent = 'Everyday Atlas / ' + Math.max(1, Math.ceil(content.body.split(/\s+/).length / 200)) + ' minute read';
    document.querySelector('meta[name="description"]').content = content.intro || content.title;
    const article = document.querySelector('article');
    const aside = document.querySelector('aside');
    article.replaceChildren();
    aside.replaceChildren();
    const heading = document.createElement('h2');
    heading.textContent = 'In this story';
    aside.append(heading);
    let count = 0;
    for (const block of content.body.split(/\n\s*\n/).filter((part) => part.trim())) {
      const isHeading = block.trim().startsWith('## ');
      const node = document.createElement(isHeading ? 'h2' : 'p');
      node.textContent = isHeading ? block.trim().slice(3) : block;
      if (isHeading) {
        node.id = 'section-' + (++count);
        const link = document.createElement('a');
        link.href = '#' + node.id;
        link.textContent = node.textContent;
        aside.append(link);
      }
      article.append(node);
    }
    aside.hidden = !count;
    document.querySelector('.layout').style.gridTemplateColumns = count ? '' : '1fr';
    const wrap = document.getElementById('destination');
    wrap.hidden = true;
    if (content.destination) {
      const url = new URL(content.destination);
      if (['http:', 'https:'].includes(url.protocol)) {
        document.getElementById('continueLink').href = url.href;
        document.getElementById('destinationHost').textContent = url.host;
        wrap.hidden = false;
      }
    }
    return content;
  } catch {
    const message = document.createElement('p');
    message.textContent = 'The latest article could not be loaded. Showing the original article; refresh to try again.';
    message.setAttribute('role', 'status');
    document.querySelector('main').prepend(message);
    return null;
  }
})();
