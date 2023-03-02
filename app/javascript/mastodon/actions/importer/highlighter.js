import hljs from 'highlight.js';

const BlockElement = 'address|blockquote|center|div|dl|fieldset|form|h[1-6]|hr|noframes|noscript|ol|p|pre|table|ul|br';
const BlockTag = `<\\/?(?:${BlockElement})[^>]*\\/?>`;
const AsLineBreak = new RegExp(BlockTag, 'g');
const CodeBlock = new RegExp(`(?:^|${BlockTag})\\s*(\`\`\`)([a-z0-9-]*)\\s*(?=$|${BlockTag})`, 'g');
const InlineCodeBlock = /`([^`<>]+)`/g;

function createHighlighIndecis(input) {
  const quoteIndices = [];
  for (const m of input.matchAll(CodeBlock)) {
    quoteIndices.push([m.index, m.index + m[0].length, 'block', m[2]]);
  }

  for (const m of input.matchAll(InlineCodeBlock)) {
    quoteIndices.push([m.index, m.index + m[0].length, 'inline', '']);
  }

  quoteIndices.sort((a, b) => a[0] - b[0]);
  return quoteIndices;
}


function normalizeCodes(str) {
  return str
    .replace(AsLineBreak, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/^\n/, '')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"');
}

function highlightCode(input, lang) {
  const code = normalizeCodes(input);
  try {
    const hl = hljs.highlight(code, { language: lang || 'plaintext' });
    if ('name' in hl._top && hl._top.name === 'Plain text') {
      return code;
    }
    return hl.value;
  } catch {
    return code;
  }
}

function createCodeBlock(input, lang) {
  return `<pre><code data-hl-lang="${lang}" class="hljs">${highlightCode(input, lang)}</code></pre>`;
}

export function highlight(input) {
  let output = '';
  let index = 0;
  let isInCodeBlock = false;
  let currentCodeBlock = '';
  let currentCodeBlockLang = '';
  const quoteIndices = createHighlighIndecis(input);
  for (const [start, end, type, lang] of quoteIndices) {
    if (isInCodeBlock) {
      currentCodeBlock += input.slice(index, start);
    } else {
      output += input.slice(index, start);
    }
    if (type === 'block') {
      if (isInCodeBlock) {
        if (lang) {
          currentCodeBlock += input.slice(start, end);
        } else {
          isInCodeBlock = false;
          output += createCodeBlock(currentCodeBlock, currentCodeBlockLang);
        }
      } else {
        currentCodeBlock = '';
        currentCodeBlockLang = lang;
        isInCodeBlock = true;
      }
    } else {
      if (isInCodeBlock) {
        currentCodeBlock += input.slice(start, end);
      } else {
        output += `<code>${input.slice(start + 1, end - 1)}</code>`;
      }
    }
    index = end;
  }

  if (isInCodeBlock) {
    output += createCodeBlock(currentCodeBlock, currentCodeBlockLang);
  }
  output += input.slice(index);
  return output;
}