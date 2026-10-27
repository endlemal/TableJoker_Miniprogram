#!/usr/bin/env python3
"""检查页面和组件的模板里用到的名字，在 <script setup> 里有没有定义。

改动大块代码（剪切、替换）时，很容易把模板还在用的函数或状态一起删掉，编译不会报错，
要到运行时点了才发现（比如比赛卡片点了没反应）。这个脚本静态检查三类用法：
  - 事件：@tap="openMatch(mt)"、@change="onFeat" 里调用的函数
  - 绑定：:current="featIdx" 这种直接写名字的绑定，以及 v-if / v-show
  - 列表：v-for="x in featured" 的数据来源
用法：python3 template_refs.py [src 目录]；有问题时退出码为 1。只是启发式检查，漏报 / 误报都可能有。
"""
import os, re, sys

GLOBALS = set('Math String Number JSON Date Array Object Boolean parseInt parseFloat encodeURIComponent decodeURIComponent isNaN Infinity undefined true false null this $event $emit $props $attrs $slots'.split())
KEYWORDS = set('if else return typeof in of new void delete instanceof true false null'.split())

def defined_names(js):
    names = set()
    names |= set(re.findall(r'\b(?:const|let|var)\s+([A-Za-z_$][\w$]*)', js))
    names |= set(re.findall(r'\bfunction\s+([A-Za-z_$][\w$]*)', js))
    for grp in re.findall(r'\b(?:const|let|var)\s*\{([^}]*)\}\s*=', js) + re.findall(r'\b(?:const|let|var)\s*\[([^\]]*)\]\s*=', js):
        for part in grp.split(','):
            part = part.split(':')[-1].split('=')[0].strip()
            if re.match(r'^[A-Za-z_$][\w$]*$', part): names.add(part)
    for m in re.finditer(r'import\s+([^;]+?)\s+from\s+[\'"]', js):
        spec = m.group(1)
        d = re.match(r'^([A-Za-z_$][\w$]*)', spec)
        if d: names.add(d.group(1))
        for inner in re.findall(r'\{([^}]*)\}', spec):
            for part in inner.split(','):
                part = part.strip().split(' as ')[-1].strip()
                if part: names.add(part)
    # defineProps({ ... })：按括号配对取出整个对象，只取第一层的键；也支持 defineProps(['a', 'b'])
    i = js.find('defineProps(')
    if i >= 0:
        j = i + len('defineProps(')
        while j < len(js) and js[j] in ' \n\t': j += 1
        if j < len(js) and js[j] in '{[':
            depth, k, top = 0, j, []
            buf = ''
            while k < len(js):
                ch = js[k]
                if ch in '{[(': depth += 1
                elif ch in '}])':
                    depth -= 1
                    if depth == 0: break
                if depth == 1: buf += ch
                elif depth > 1 and ch in '{[(' and js[k - 1] != '\\': buf += ' '
                k += 1
            if js[j] == '{':
                names |= set(re.findall(r'(?:^|[,{\s])([A-Za-z_$][\w$]*)\s*:', buf))
            else:
                names |= set(re.findall(r'[\'"]([A-Za-z_$][\w$]*)[\'"]', buf))
    return names

def loop_vars(tpl):
    out = set()
    for expr in re.findall(r'v-for="([^"]+)"', tpl):
        lhs = expr.split(' in ')[0].split(' of ')[0]
        out |= set(re.findall(r'[A-Za-z_$][\w$]*', lhs))
    out |= set(re.findall(r'v-slot(?::[\w-]+)?="\{?\s*([A-Za-z_$][\w$]*)', tpl))
    return out

def check(path):
    s = open(path, encoding='utf-8').read()
    if '<script setup>' not in s or '<template>' not in s: return []
    tpl = s[s.index('<template>'):s.index('<script setup>')]
    js = s[s.index('<script setup>'):s.index('</script>', s.index('<script setup>'))]
    known = defined_names(js) | loop_vars(tpl) | GLOBALS
    used = {}
    def use(name, where):
        if name and name not in known and name not in KEYWORDS and not name[0].isdigit():
            used.setdefault(name, where)
    for ev, expr in re.findall(r'@([\w.-]+)="([^"]+)"', tpl):
        expr = expr.strip()
        if re.match(r'^[A-Za-z_$][\w$]*$', expr): use(expr, '@' + ev)
        for fn in re.findall(r'(?<![\w$.])([A-Za-z_$][\w$]*)\s*\(', expr): use(fn, '@' + ev)
    for attr, expr in re.findall(r'\s(?::|v-bind:|v-if=|v-show=|v-else-if=)([\w-]*)="?([^"]*)"', tpl):
        pass
    for attr, expr in re.findall(r'\s:([\w-]+)="([A-Za-z_$][\w$]*)"', tpl): use(expr, ':' + attr)
    for expr in re.findall(r'\sv-(?:if|show|else-if)="!?([A-Za-z_$][\w$]*)"', tpl): use(expr, 'v-if')
    for expr in re.findall(r'v-for="[^"]+\s(?:in|of)\s+([A-Za-z_$][\w$]*)"', tpl): use(expr, 'v-for')
    return sorted(used.items())

def main():
    root = sys.argv[1] if len(sys.argv) > 1 else 'src'
    bad = 0
    for d, _, files in os.walk(root):
        for f in sorted(files):
            if f.endswith('.vue'):
                p = os.path.join(d, f)
                miss = check(p)
                if miss:
                    bad += 1
                    print(f'{p}：模板里用到、脚本里没有定义 → ' + '，'.join(f'{n}（{w}）' for n, w in miss))
    print('模板引用检查：', '没有问题' if not bad else f'{bad} 个文件有问题')
    sys.exit(1 if bad else 0)

if __name__ == '__main__':
    main()
