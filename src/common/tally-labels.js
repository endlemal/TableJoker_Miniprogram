// 简短状态用于牌桌；点按标签查看完整含义。全下属于本手状态，不能由余额为 0 推断。
export function playerStatus(hand, seat, index) {
  const player = hand && hand.street !== 'done' && hand.players[index]
  if (player) {
    if (player.folded) return { label: '弃牌', tone: '', detail: '已放弃本手，等待下一手。' }
    const won = hand.street === 'payout' && hand.pots && hand.pots.some((p) => p.shares && p.shares[index])
    if (won) return { label: '赢', tone: 'win', detail: '已获分配，可收取对应池的记分。' }
    if (player.allIn) return { label: '全下', tone: 'hot', detail: 'All-in：已投入全部记分，仍参与本手结算。' }
    if (['preflop', 'flop', 'turn', 'river'].includes(hand.street) && hand.toAct === index) {
      return { label: '行动', tone: 'turn', detail: '轮到该玩家操作，头像外圈显示剩余时间。' }
    }
    return { label: player.last || '', tone: '', detail: player.last ? `本手最近动作：${player.last}` : '' }
  }
  if (seat.stack <= 0) return { label: '无分', tone: 'empty', detail: '记分为 0，无法参与新的一手。' }
  if (hand && hand.street !== 'done') return { label: '候场', tone: 'wait', detail: '已入座，本手未参与，从下一手加入。' }
  return { label: '', tone: '', detail: '' }
}

export const TALLY_HELP = [
  '候场：下一手加入；无分：记分为 0，不能开新手；全下（All-in）：已投入全部记分，仍参与本手结算。',
  '行动：轮到该玩家。头像外圈为倒计时；进度条虚线为本轮跟注目标，追平后变绿。点状态标签可看解释。',
  'SB / BB：小盲 / 大盲；BTN：庄位；UTG：大盲后首位；EP / MP / CO：前位 / 中位 / 庄位前一位。',
  '翻前 → 翻牌 → 转牌 → 河牌 → 定胜 → 收分。定胜由主持人为每个池选赢家，平手可多选。',
  '跟注金额为本次需补的分；加至为本轮累计目标。总池包含所有玩家本手投入；盈亏为累计变化。'
].join('\n\n')
