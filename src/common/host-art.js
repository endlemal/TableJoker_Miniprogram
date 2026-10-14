// 平台认证页首屏插画：荷官在发三张公共牌，你坐在牌桌前沿。Lottie 动画接入前的占位，画布 750×800，和页面里的 rpx 一一对应
export function cardBack() {
  const pips = [[26, 39], [38, 39], [26, 51], [38, 51]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="3.6" fill="#F3EEE6"/>`).join('')
  return '<svg xmlns="http://www.w3.org/2000/svg" width="64" height="90" viewBox="0 0 64 90"><rect width="64" height="90" rx="8" fill="#B80000"/>' +
    '<rect x="5" y="5" width="54" height="80" rx="5" fill="none" stroke="#F3B3B3" stroke-width="2"/>' + pips + '</svg>'
}

function chips(cx, base, list) {
  const TONE = { red: ['#B80000', '#DC0000'], ivory: ['#CFC8BC', '#F3EEE6'], gold: ['#C8902A', '#F4B740'] }
  return list.map((t, k) => {
    const y = base - k * 9
    const [side, top] = TONE[t]
    return `<ellipse cx="${cx}" cy="${y}" rx="26" ry="8" fill="${side}"/><rect x="${cx - 26}" y="${y - 7}" width="52" height="7" fill="${side}"/><ellipse cx="${cx}" cy="${y - 7}" rx="26" ry="8" fill="${top}"/>`
  }).join('')
}

export function dealerStage() {
  const SKIN = '#F1C7A8'
  const HAIR = '#1A1414'
  const slots = [299, 375, 451].map((cx) => `<rect x="${cx - 32}" y="430" width="64" height="90" rx="8" fill="#1A3A31" stroke="#2F5A4D" stroke-width="2" stroke-dasharray="6 6"/>`).join('')
  return '<svg xmlns="http://www.w3.org/2000/svg" width="750" height="800" viewBox="0 0 750 800">' +
    '<rect width="750" height="800" fill="#121419"/><circle cx="375" cy="210" r="250" fill="#171A21"/><circle cx="375" cy="210" r="170" fill="#1C1F27"/>' +
    // 头发、脸
    `<circle cx="375" cy="96" r="30" fill="${HAIR}"/><rect x="360" y="118" width="30" height="7" rx="3.5" fill="#DC0000"/>` +
    `<ellipse cx="375" cy="168" rx="64" ry="70" fill="${HAIR}"/><rect x="358" y="212" width="34" height="38" fill="#E3B08E"/>` +
    `<ellipse cx="375" cy="172" rx="50" ry="56" fill="${SKIN}"/>` +
    `<path d="M323 170 C326 120 424 112 428 166 C414 140 372 134 323 170 Z" fill="${HAIR}"/>` +
    `<path d="M326 160 C318 190 322 214 334 228 C330 204 330 184 336 168 Z" fill="${HAIR}"/><path d="M424 160 C432 190 428 214 416 228 C420 204 420 184 414 168 Z" fill="${HAIR}"/>` +
    '<ellipse cx="356" cy="180" rx="4.5" ry="6" fill="#2A1E1E"/><ellipse cx="394" cy="180" rx="4.5" ry="6" fill="#2A1E1E"/>' +
    '<circle cx="346" cy="198" r="8" fill="#F2A49B" fill-opacity=".45"/><circle cx="404" cy="198" r="8" fill="#F2A49B" fill-opacity=".45"/>' +
    '<path d="M366 204 Q375 212 384 204" fill="none" stroke="#B5473F" stroke-width="3" stroke-linecap="round"/>' +
    // 白衬衫、黑马甲、红领结、胸牌
    '<path d="M262 340 C266 272 312 244 375 244 C438 244 484 272 488 340 Z" fill="#F3EEE6"/>' +
    '<path d="M270 340 C274 284 306 258 350 250 L375 306 L375 340 Z" fill="#15171C"/><path d="M480 340 C476 284 444 258 400 250 L375 306 L375 340 Z" fill="#15171C"/>' +
    '<polygon points="375,256 349,243 349,269" fill="#DC0000"/><polygon points="375,256 401,243 401,269" fill="#DC0000"/><rect x="368" y="249" width="14" height="14" rx="4" fill="#B80000"/>' +
    '<circle cx="375" cy="318" r="3.5" fill="#2A2D36"/><circle cx="375" cy="332" r="3.5" fill="#2A2D36"/>' +
    '<rect x="410" y="286" width="36" height="13" rx="3" fill="#F4B740"/><rect x="416" y="291" width="24" height="3" rx="1.5" fill="#8A5A12"/>' +
    // 手臂
    '<path d="M282 300 C258 330 264 366 300 378 L312 360 C290 350 288 330 300 310 Z" fill="#E9E3D8"/>' +
    '<path d="M468 300 C492 330 486 362 450 372 L440 354 C460 346 462 328 450 310 Z" fill="#E9E3D8"/>' +
    // 牌桌：远端桌边、台呢、下注线、五个公共牌位、两侧记分牌
    '<path d="M-20 800 L-20 372 C140 344 610 344 770 372 L770 800 Z" fill="#17302A"/>' +
    '<path d="M-20 372 C140 344 610 344 770 372 L770 386 C610 358 140 358 -20 386 Z" fill="#0E1A16"/>' +
    '<path d="M60 404 C220 386 530 386 690 404" fill="none" stroke="#2B5246" stroke-width="2"/>' + slots +
    chips(120, 572, ['red', 'ivory', 'red', 'gold']) + chips(630, 572, ['ivory', 'gold', 'red', 'ivory', 'gold', 'red']) +
    // 牌桌前沿（你的座位）和桌外的地面
    '<path d="M-20 690 C150 630 600 630 770 690 L770 714 C600 654 150 654 -20 714 Z" fill="#0E1A16"/>' +
    '<path d="M-20 714 C150 654 600 654 770 714 L770 800 L-20 800 Z" fill="#121419"/>' +
    // 左手握牌，右手发牌
    '<rect x="291" y="356" width="46" height="64" rx="6" fill="#7A0000"/><rect x="288" y="352" width="46" height="64" rx="6" fill="#B80000"/>' +
    '<rect x="293" y="357" width="36" height="54" rx="4" fill="none" stroke="#F3B3B3" stroke-width="2"/>' +
    `<ellipse cx="314" cy="410" rx="24" ry="13" fill="${SKIN}"/><ellipse cx="336" cy="388" rx="8" ry="11" fill="${SKIN}"/>` +
    `<ellipse cx="446" cy="378" rx="19" ry="12" fill="${SKIN}"/>` +
    '</svg>'
}
