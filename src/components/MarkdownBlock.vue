<script setup>
import { computed } from 'vue'
import { marked } from 'marked'

marked.setOptions({
  gfm: true,
  breaks: true,
})

const props = defineProps({
  /** Raw markdown from the API */
  source: { type: String, default: '' },
})

const html = computed(() => {
  const s = props.source ?? ''
  if (!s.trim()) return ''
  return marked.parse(s)
})
</script>

<template>
  <div class="agent-markdown" v-html="html" />
</template>

<style scoped>
.agent-markdown :deep(p) {
  margin: 0.65em 0;
}
.agent-markdown :deep(p:first-child) {
  margin-top: 0;
}
.agent-markdown :deep(p:last-child) {
  margin-bottom: 0;
}
.agent-markdown :deep(h1) {
  font-size: 1.35rem;
  font-weight: 700;
  margin: 1em 0 0.5em;
  letter-spacing: -0.02em;
}
.agent-markdown :deep(h2) {
  font-size: 1.2rem;
  font-weight: 650;
  margin: 0.9em 0 0.45em;
  letter-spacing: -0.02em;
}
.agent-markdown :deep(h3) {
  font-size: 1.06rem;
  font-weight: 650;
  margin: 0.85em 0 0.4em;
}
.agent-markdown :deep(ul),
.agent-markdown :deep(ol) {
  margin: 0.5em 0;
  padding-left: 1.35em;
}
.agent-markdown :deep(li) {
  margin: 0.25em 0;
}
.agent-markdown :deep(a) {
  color: var(--color-primary, #ff7100);
  text-decoration: underline;
  text-underline-offset: 2px;
}
.agent-markdown :deep(a:hover) {
  opacity: 0.9;
}
.agent-markdown :deep(code) {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 0.88em;
  padding: 0.12em 0.38em;
  border-radius: 0.35rem;
  background: rgba(0, 0, 0, 0.06);
}
@media (prefers-color-scheme: dark) {
  .agent-markdown :deep(code) {
    background: rgba(255, 255, 255, 0.08);
  }
}
.agent-markdown :deep(pre) {
  margin: 0.75em 0;
  padding: 0.85em 1em;
  border-radius: 0.65rem;
  overflow-x: auto;
  background: rgba(0, 0, 0, 0.06);
  border: 1px solid rgba(0, 0, 0, 0.08);
}
@media (prefers-color-scheme: dark) {
  .agent-markdown :deep(pre) {
    background: rgba(0, 0, 0, 0.35);
    border-color: rgba(255, 255, 255, 0.08);
  }
}
.agent-markdown :deep(pre code) {
  padding: 0;
  background: none;
  font-size: 0.82rem;
  line-height: 1.5;
}
.agent-markdown :deep(blockquote) {
  margin: 0.75em 0;
  padding-left: 0.9em;
  border-left: 3px solid rgba(0, 0, 0, 0.12);
  color: rgb(82 82 91);
}
@media (prefers-color-scheme: dark) {
  .agent-markdown :deep(blockquote) {
    border-left-color: rgba(255, 255, 255, 0.15);
    color: rgb(161 161 170);
  }
}
.agent-markdown :deep(table) {
  width: 100%;
  border-collapse: collapse;
  margin: 0.75em 0;
  font-size: 0.9em;
}
.agent-markdown :deep(th),
.agent-markdown :deep(td) {
  border: 1px solid rgba(0, 0, 0, 0.1);
  padding: 0.45em 0.65em;
  text-align: left;
}
@media (prefers-color-scheme: dark) {
  .agent-markdown :deep(th),
  .agent-markdown :deep(td) {
    border-color: rgba(255, 255, 255, 0.12);
  }
}
.agent-markdown :deep(th) {
  font-weight: 600;
  background: rgba(0, 0, 0, 0.04);
}
@media (prefers-color-scheme: dark) {
  .agent-markdown :deep(th) {
    background: rgba(255, 255, 255, 0.05);
  }
}
.agent-markdown :deep(hr) {
  margin: 1.25em 0;
  border: none;
  border-top: 1px solid rgba(0, 0, 0, 0.1);
}
@media (prefers-color-scheme: dark) {
  .agent-markdown :deep(hr) {
    border-top-color: rgba(255, 255, 255, 0.1);
  }
}
</style>
