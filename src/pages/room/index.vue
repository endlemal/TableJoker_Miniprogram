<template>
  <view class="room" :class="{ 'room-land': land }">
    <!-- 顶部导航：返回 + 房间名（纯文字），右边给小程序胶囊让出位置 -->
    <view class="nav" :style="navStyle">
      <view class="nav-back" hover-class="press" @tap="goBackOrHome"><z-icon name="arrow-left" :size="20" color="#F3EEE6" /></view>
      <text class="nav-name" :class="{ 'font-sys': !fitsDisplay(room.name) }">{{ room.name }}</text>
    </view>

    <view class="main">
      <view class="col-a">
        <!-- 赛事状态栏：级别、已进行时长、运行状态（颜色配文字） -->
        <view class="status">
          <text class="st-lv">{{ isBreak ? '休息' : '第 ' + cur.no + ' 级' }}</text>
          <text class="st-el">已进行 {{ elapsedMin }} 分钟</text>
          <view class="st-state" :style="'color:' + stateInfo.color"><view class="st-dot" :style="'background:' + stateInfo.color"></view><text>{{ stateInfo.text }}</text></view>
        </view>

        <!-- 键盘或表情面板打开时：赛事区收成一行摘要 -->
        <view class="summary" :class="{ 'summary-on': compact }">
          <text class="sm-time" :style="'color:' + clockColor">{{ clockText }}</text>
          <text class="sm-b">{{ blindText }}</text>
          <text class="sm-s" :style="'color:' + stateInfo.color">{{ stateInfo.text }}</text>
        </view>

        <!-- 内容展示区：只能手动左右滑；签到墙、Timer（默认），主持人开启的玩法依次排在 Timer 后面 -->
        <view class="stage" :class="{ 'stage-hide': compact }" :style="'height:' + stageH + 'px'">
          <swiper class="pages" :current="pageIdx" :autoplay="false" :circular="false" :duration="260" @change="onPage">
            <swiper-item v-for="p in pages" :key="p.key">
              <scroll-view scroll-y class="pg" :class="'pg-' + p.key">
                <!-- 签到墙 -->
                <view v-if="p.key === 'wall'" class="wall">
                  <text class="wall-t">签到墙</text>
                  <view class="wall-grid">
                    <view v-for="m in members" :key="m.name" class="wall-i" :style="'width:' + wallCol">
                      <view class="wall-av" :style="'background:' + m.bg + ';color:' + m.fg"><text>{{ m.c }}</text><text v-if="m.seat" class="wall-seat">{{ m.seat }}</text></view>
                      <text class="wall-n">{{ m.name }}</text>
                    </view>
                    <button class="wall-i wall-inv" :style="'width:' + wallCol" open-type="share" hover-class="press">
                      <view class="wall-av wall-av-inv"><z-icon name="plus" :size="24" color="#F3EEE6" /></view>
                      <text class="wall-n wall-n-inv">邀请</text>
                    </button>
                  </view>
                </view>

                <!-- Timer：翻牌倒计时、进度、盲注、距休息、盲注表 -->
                <view v-else-if="p.key === 'timer'" class="tm" @longpress="jumpToEnd">
                  <view class="tm-top">
                    <text class="tm-tag">{{ room.type }}</text>
                    <view class="tm-brk"><text class="tm-brk-k">{{ isBreak ? '距下次休息' : '距休息' }}</text><text class="tm-brk-v">{{ toBreak }}</text></view>
                  </view>
                  <view class="clock" :class="{ 'clock-breathe': tstate.breathe }">
                    <z-flap :value="clockDigits[0]" :w="flap.w" :h="flap.h" :fs="flap.fs" :color="clockColor" />
                    <view class="clock-gap"></view>
                    <z-flap :value="clockDigits[1]" :w="flap.w" :h="flap.h" :fs="flap.fs" :color="clockColor" />
                    <view class="colon"><view class="colon-dot" :style="'background:' + clockColor"></view><view class="colon-dot" :style="'background:' + clockColor"></view></view>
                    <z-flap :value="clockDigits[2]" :w="flap.w" :h="flap.h" :fs="flap.fs" :color="clockColor" />
                    <view class="clock-gap"></view>
                    <z-flap :value="clockDigits[3]" :w="flap.w" :h="flap.h" :fs="flap.fs" :color="clockColor" />
                  </view>
                  <view class="prog"><view class="prog-fill" :style="'width:' + progress + '%'"></view></view>
                  <view class="tm-row">
                    <view class="tm-struct" hover-class="press" @tap="structOpen = true">
                      <z-icon name="list" :size="20" color="#C9CDD4" />
                      <text class="tm-struct-t">盲注表</text>
                    </view>
                    <view v-for="b in blindItems" :key="b.label" class="bl">
                      <z-flap :value="b.value" :w="bflap.w" :h="bflap.h" :fs="bflap.fs" :hinge="1" :pin="4" :stack="3" />
                      <text class="bl-cap">{{ b.label }}</text>
                    </view>
                  </view>
                </view>

                <!-- 玩法：经典德扑（没入座时是牌桌列表，入座后是自己的牌桌） -->
                <view v-else-if="p.key === 'holdem'" class="hp">
                  <z-holdem-table v-if="spot" :table="spot.t" :me="ME_NAME" :blinds="holdem.blinds" :dense="stageH < 290" @leave="leaveHoldem" />
                  <view v-else class="tl">
                    <view class="tl-head"><text class="play-t">牌桌</text><text class="tl-me">我的记分 {{ fmtNum(holdem.assets[ME_NAME]) }}</text></view>
                    <view v-for="t in holdem.tables" :key="t.id" class="tl-card">
                      <view class="tl-top">
                        <view class="tl-main"><text class="tl-name">{{ t.name }}</text><text class="tl-sub">{{ t.size }} 人桌 · {{ seatedOf(t) }}/{{ t.size }} 已入座 · {{ t.hand && t.hand.street !== 'done' ? '第 ' + t.handNo + ' 手进行中' : '等待开局' }}</text></view>
                        <view class="tl-join" :class="{ 'tl-join-off': seatedOf(t) >= t.size }" hover-class="press" @tap="joinHoldem(t)"><text class="tl-join-t">{{ seatedOf(t) >= t.size ? '坐满了' : '加入' }}</text></view>
                      </view>
                      <view class="tl-seats"><view v-for="(st, k) in t.seats" :key="k" class="tl-seat" :class="{ 'tl-seat-empty': !st }" :style="st ? 'background:' + st.bg + ';color:' + st.fg : ''"><text v-if="st">{{ st.c }}</text></view></view>
                    </view>
                    <text v-if="!holdem.tables.length" class="play-s">主持人还没开桌</text>
                    <text class="play-s">盲注跟着房间当前的级别：{{ fmtNum(holdem.blinds.sb) }}/{{ fmtNum(holdem.blinds.bb) }}{{ holdem.blinds.ante ? '，前注 ' + fmtNum(holdem.blinds.ante) : '' }}</text>
                  </view>
                </view>

                <!-- 玩法：走字灯 -->
                <view v-else-if="p.key === 'ticker'" class="play">
                  <text class="play-t">走字灯</text>
                  <view class="ticker"><view class="mq" :style="'animation-duration:' + tickerDur + 's'"><text v-for="t in tickerItems" :key="t.key" class="mq-msg" :class="'mq-' + t.type">{{ t.label }}</text></view></view>
                  <text class="play-s">公告：{{ notice }}</text>
                </view>

                <!-- 玩法：边池计算 -->
                <view v-else-if="p.key === 'pot'" class="play">
                  <text class="play-t">边池计算</text>
                  <text class="play-s play-s-top">填每人这一手的总投入，自动分出主池和边池</text>
                  <view v-for="(r, i) in potRows" :key="r.name" class="pot-r">
                    <text class="pot-n">{{ r.name }}</text>
                    <input class="pot-in" type="number" :value="r.amount" placeholder="0" placeholder-class="pot-ph" @input="setPot(i, $event)" />
                  </view>
                  <view v-for="(pt, i) in pots" :key="i" class="pot-res">
                    <text class="pot-res-k">{{ i === 0 ? '主池' : '边池 ' + i }}</text>
                    <text class="pot-res-v">{{ fmtNum(pt.amount) }}</text>
                    <text class="pot-res-s">{{ pt.who.join('、') }}</text>
                  </view>
                </view>
              </scroll-view>
            </swiper-item>
          </swiper>
          <!-- 分页指示：当前页是短胶囊，其余是圆点 -->
          <view class="dots"><view v-for="(p, i) in pages" :key="p.key" class="dot" :class="{ 'dot-on': i === pageIdx }"></view></view>
        </view>

        <!-- 成员概览：叠放头像和人数，点开是签到墙 -->
        <view class="members" hover-class="press-soft" @tap="pageKey = 'wall'">
          <view class="stack"><view v-for="(m, i) in members.slice(0, 3)" :key="m.name" class="sk-av" :style="'background:' + m.bg + ';color:' + m.fg + ';z-index:' + (3 - i)"><text>{{ m.c }}</text></view></view>
          <text class="mb-n">+{{ Math.max(0, members.length - 3) }}</text>
          <text class="mb-s">{{ members.length }} 人已签到</text>
        </view>
      </view>

      <view class="col-b">
        <!-- 气泡弹幕：靠左，最近几条，越早越淡；点了打开完整的房间弹幕列表 -->
        <view class="dm-area"><z-danmaku :list="danmakuList" :max="spot ? 2 : land ? 6 : 5" @open="openChat" /><z-holdem-act v-if="spot" :table="spot.t" :seat="spot.i" :turn-left="holdem.turnLeft" @act="onHoldemAct" /></view>

        <!-- 抽屉打开时输入栏和抽屉一起浮在屏幕底部，这里留出输入栏的位置，房间内容不会被顶上去 -->
        <view v-if="drawer.show" class="bottom-spacer"></view>
        <!-- 底部：输入栏 + 表情面板；键盘弹出时输入栏顶在键盘上面 -->
        <view class="bottom" :class="{ 'bottom-top': drawer.show }" :style="bottomStyle">
          <z-room-input
            v-model="draft"
            :panel="drawer.show ? 'more' : panel"
            :failed="failed"
            :focus-key="focusKey"
            :cursor="cursor"
            placeholder="给房间发消息"
            @send="send"
            @more="toggleMore"
            @emoji="toggleEmoji"
            @kb="onKb"
            @focus="onInputFocus"
            @cursor="cursor = $event"
          />
          <z-emoji-panel v-if="panel === 'emoji'" @pick="pickEmoji" @del="delEmoji" />
          <!-- 更多：抽屉在输入栏下面（输入栏左边的按钮变成 ×，再点一次收起）；上面是内容面板，底部是悬浮导航 -->
          <view v-if="drawer.show" class="dr-sheet" :class="{ 'dr-on': drawer.open }" :style="drawer.drag ? 'transform:translateY(' + drawer.drag + 'px)' : ''">
            <view class="dr-grab-area" @touchstart="dragStart" @touchmove="dragMove" @touchend="dragEnd" @touchcancel="dragEnd"><view class="dr-grab"></view></view>
            <scroll-view scroll-y class="dr-body">
              <view :key="drawer.tab" class="dr-panel" :class="'dr-from-' + drawer.dir">
                <!-- 图片：宫格预览。第一格拍照、第二格相册，后面是选出来的照片（点选，长按看大图），选好一起发 -->
                <block v-if="drawer.tab === 'image'">
                  <view class="ph-head"><text class="dp-t">照片</text><text v-if="photoSel.length" class="ph-clear" @tap="photoSel = []">取消选择</text></view>
                  <view class="ph-grid">
                    <view class="ph-cell" hover-class="press" @tap="pickPhotos('camera')"><view class="ph-tool"><z-icon name="camera" :size="26" color="#C9CDD4" /><text class="ph-tool-t">拍照</text></view></view>
                    <view class="ph-cell" hover-class="press" @tap="pickPhotos('album')"><view class="ph-tool"><z-icon name="photo" :size="26" color="#C9CDD4" /><text class="ph-tool-t">相册</text></view></view>
                    <view v-for="ph in photos" :key="ph" class="ph-cell" @tap="togglePhoto(ph)" @longpress="previewPhoto(ph)">
                      <image class="ph-img" :src="ph" mode="aspectFill" />
                      <view class="ph-ck" :class="{ 'ph-ck-on': photoSel.includes(ph) }"><text v-if="photoSel.includes(ph)" class="ph-ck-t">{{ photoSel.indexOf(ph) + 1 }}</text></view>
                    </view>
                  </view>
                  <view v-if="photoSel.length" class="ph-send" hover-class="press" @tap="sendPhotos"><text class="ph-send-t">发送 {{ photoSel.length }} 张</text></view>
                  <text class="dp-s">微信不允许小程序直接读取相册：从相册选出的照片（一次最多 9 张）会放在这里，可以多选后一起发；长按查看大图</text>
                </block>
                <!-- 主持人 -->
                <block v-else-if="drawer.tab === 'host'">
                  <text class="dp-t">主持人</text>
                  <view class="hosts"><view v-for="h in room.hosts" :key="h.name" class="host-chip"><text class="host-n">{{ h.name }}</text><text class="host-r">{{ h.role === 'owner' ? '房主' : '共同主持' }}</text></view></view>
                  <block v-if="isHost">
                    <text class="dp-h">计时</text>
                    <view class="hgrid">
                      <view class="hbtn" hover-class="press" @tap="togglePause"><z-icon :name="paused ? 'player-play' : 'player-pause'" :size="20" color="#F3EEE6" /><text class="hbtn-t">{{ paused ? '继续' : '暂停' }}</text></view>
                      <view class="hbtn" hover-class="press" @tap="stepLevel(-1)"><z-icon name="player-skip-back" :size="20" color="#F3EEE6" /><text class="hbtn-t">上一级</text></view>
                      <view class="hbtn" hover-class="press" @tap="stepLevel(1)"><z-icon name="player-skip-forward" :size="20" color="#F3EEE6" /><text class="hbtn-t">下一级</text></view>
                      <view class="hbtn" hover-class="press" @tap="addTime(-60)"><z-icon name="minus" :size="20" color="#F3EEE6" /><text class="hbtn-t">减 1 分钟</text></view>
                      <view class="hbtn" hover-class="press" @tap="addTime(60)"><z-icon name="plus" :size="20" color="#F3EEE6" /><text class="hbtn-t">加 1 分钟</text></view>
                      <view class="hbtn" hover-class="press" @tap="shuffleSeats"><z-icon name="arrows-shuffle" :size="20" color="#F3EEE6" /><text class="hbtn-t">抽座位</text></view>
                    </view>
                    <text class="dp-h">房间公告</text>
                    <view class="notice-row">
                      <input v-model="noticeDraft" class="notice-in" maxlength="40" placeholder="写一句公告，走字灯和消息里都会显示" placeholder-class="ph" />
                      <view class="pbtn" :class="{ 'pbtn-off': !noticeDraft.trim() || noticeDraft.trim() === notice }" hover-class="press" @tap="publishNotice"><text class="pbtn-t">发布</text></view>
                    </view>
                  </block>
                  <text v-else class="dp-s">只有主持人可以控制计时、发布公告和抽座位</text>
                  <!-- 经典德扑的牌桌：开桌（2 到 10 人）和删桌 -->
                  <block v-if="playsOn.includes('holdem')">
                    <text class="dp-h">经典德扑牌桌</text>
                    <view v-for="t in holdem.tables" :key="t.id" class="tb-row">
                      <text class="tb-n">{{ t.name }}</text><text class="tb-s">{{ t.size }} 人桌 · {{ seatedOf(t) }} 人在座</text>
                      <view v-if="isHost" class="tb-del" hover-class="press" @tap="deleteTable(t)"><text class="tb-del-t">删除</text></view>
                    </view>
                    <block v-if="isHost">
                      <view class="sz-row"><text v-for="n in 9" :key="n" class="sz" :class="{ 'sz-on': newSize === n + 1 }" @tap="newSize = n + 1">{{ n + 1 }}</text></view>
                      <view class="tb-add" hover-class="press" @tap="addTable"><z-icon name="plus" :size="16" color="#FFFFFF" /><text class="tb-add-t">开一张 {{ newSize }} 人桌</text></view>
                    </block>
                  </block>
                </block>
                <!-- 玩法 -->
                <block v-else-if="drawer.tab === 'play'">
                  <text class="dp-t">玩法</text>
                  <view v-for="pl in PLAYS" :key="pl.key" class="pl-row">
                    <view class="pl-ic"><z-icon :name="pl.icon" :size="22" color="#F3EEE6" /></view>
                    <view class="pl-main"><text class="pl-n">{{ pl.name }}</text><text class="pl-d">{{ pl.desc }}</text></view>
                    <switch v-if="isHost" :checked="playsOn.includes(pl.key)" color="#5865F2" @change="togglePlay(pl)" />
                    <text v-else class="pl-st" :class="{ 'pl-st-on': playsOn.includes(pl.key) }">{{ playsOn.includes(pl.key) ? '已开启' : '未开启' }}</text>
                  </view>
                  <text class="dp-s">开启后排在 Timer 后面，左右滑动查看{{ isHost ? '' : '；只有主持人可以开关玩法' }}</text>
                  <block v-if="playsOn.includes('holdem')">
                    <text class="dp-h">玩家资产{{ isHost ? '（点头像调整）' : '' }}</text>
                    <view class="as-grid">
                      <view v-for="m in members" :key="m.name" class="as-i" hover-class="press" @tap="openAssets(m)">
                        <view class="as-av" :style="'background:' + m.bg + ';color:' + m.fg"><text>{{ m.c }}</text></view>
                        <text class="as-n">{{ m.name }}</text><text class="as-v">{{ fmtNum(holdem.assets[m.name]) }}</text>
                      </view>
                    </view>
                  </block>
                </block>
                <!-- 记分 -->
                <block v-else-if="drawer.tab === 'score'">
                  <view class="sc-head"><text class="dp-t">记分</text><text class="sc-sum">合计 {{ fmtNum(totalScore) }} · 平均 {{ fmtNum(avgScore) }}</text></view>
                  <view v-for="(s, i) in ranked" :key="s.name" class="sc-row">
                    <text class="sc-rank" :class="{ 'sc-rank-top': i < 3 }">{{ i + 1 }}</text>
                    <view class="sc-av" :style="'background:' + s.bg + ';color:' + s.fg"><text>{{ s.c }}</text></view>
                    <text class="sc-n">{{ s.name }}</text>
                    <view v-if="isHost" class="sc-step">
                      <view class="sc-b" hover-class="press" @tap="adjustScore(s, -1000)"><z-icon name="minus" :size="14" color="#F3EEE6" /></view>
                      <text class="sc-v">{{ fmtNum(s.score) }}</text>
                      <view class="sc-b" hover-class="press" @tap="adjustScore(s, 1000)"><z-icon name="plus" :size="14" color="#F3EEE6" /></view>
                    </view>
                    <text v-else class="sc-v">{{ fmtNum(s.score) }}</text>
                  </view>
                  <text class="dp-s">{{ isHost ? '每次加减 1,000；只有主持人可以改记分' : '只有主持人可以改记分' }}</text>
                </block>
              </view>
            </scroll-view>
            <!-- 悬浮导航：图片｜弹幕｜主持人｜玩法｜记分 -->
            <view class="dr-nav">
              <view v-for="t in TABS" :key="t.key" class="dn" :class="{ 'dn-on': drawer.tab === t.key }" hover-class="press" @tap="pickTab(t.key)">
                <z-icon :name="t.icon" :size="22" :color="drawer.tab === t.key ? '#F3EEE6' : '#8E929B'" />
                <text class="dn-t">{{ t.name }}</text>
              </view>
            </view>
          </view>
        </view>
      </view>
    </view>

    <!-- 盲注表：全屏浮层，暗色遮罩加背景模糊；点表外面的地方退出 -->
    <view v-if="structOpen" class="bt" @tap="structOpen = false" @touchmove.stop.prevent="noop">
      <view class="bt-card" @tap.stop="noop">
        <view class="bt-head"><text class="bt-title">盲注结构</text><text class="bt-sub">共 {{ totalLevels }} 级 · 点表外面关闭</text></view>
        <view class="tr tr-head"><text class="tc">级别</text><text class="tc">盲注</text><text class="tc">前注</text><text class="tc">时长</text><text class="tc">开始</text></view>
        <scroll-view scroll-y class="bt-body" :scroll-into-view="'lv' + Math.max(0, idx - 2)">
          <view v-for="r in fullTable" :id="'lv' + r.key" :key="r.key" class="tr" :class="{ 'tr-cur': r.current, 'tr-past': r.past, 'tr-break': r.isBreak }">
            <text class="tc" :style="r.current ? 'color:' + tstate.color : ''">{{ r.lv }}</text>
            <text class="tc">{{ r.blinds }}</text>
            <text class="tc">{{ r.ante }}</text>
            <text class="tc">{{ r.dur }} 分</text>
            <text class="tc" :style="r.current ? 'color:' + tstate.color : ''">{{ r.start }}</text>
          </view>
        </scroll-view>
      </view>
    </view>
    <!-- 调整资产（主持人） -->
    <view v-if="assetsEdit" class="bt" @tap="assetsEdit = null" @touchmove.stop.prevent="noop">
      <view class="as-card" @tap.stop="noop">
        <view class="as-head"><view class="as-av as-av-l" :style="'background:' + assetsEdit.bg + ';color:' + assetsEdit.fg"><text>{{ assetsEdit.c }}</text></view><text class="as-title">调整 {{ assetsEdit.name }} 的资产</text></view>
        <input v-model="assetsDraft" class="as-in" type="number" maxlength="9" placeholder="记分" placeholder-class="ph" />
        <view class="as-quick"><text v-for="d in [-5000, -1000, 1000, 5000]" :key="d" class="as-q" @tap="assetsDraft = String(Math.max(0, (Number(assetsDraft) || 0) + d))">{{ d > 0 ? '+' : '−' }}{{ fmtNum(Math.abs(d)) }}</text></view>
        <view class="as-acts"><view class="as-btn" hover-class="press" @tap="assetsEdit = null"><text class="as-btn-t">取消</text></view><view class="as-btn as-btn-ok" hover-class="press" @tap="saveAssets"><text class="as-btn-t">保存</text></view></view>
        <text class="dp-s">在座的玩家立即生效（已经投入这一手的不变）；记分面板同步</text>
      </view>
    </view>
    <!-- 抽屉的遮罩：盖住上面的房间内容，点一下收起 -->
    <view v-if="drawer.show" class="dr-mask" :class="{ 'dr-mask-on': drawer.open }" @tap="closeDrawer" @touchmove.stop.prevent="noop"></view>
  </view>
</template>

<script setup>
// 房间：顶部导航、赛事状态栏、可手动横滑的内容展示区（签到墙、Timer、主持人开启的玩法）、成员概览和气泡弹幕、底部消息输入栏。
// 「更多」打开底部抽屉：图片｜弹幕｜主持人｜玩法｜记分；「弹幕」打开完整的房间弹幕列表页。
// 系统键盘、表情面板、更多抽屉三者互斥；键盘或表情面板打开时，赛事区收成一行摘要
import { ref, reactive, computed, watch, nextTick } from 'vue'
import { onLoad, onShow, onHide, onUnload, onShareAppMessage } from '@dcloudio/uni-app'
import { requireLogin } from '@/common/auth.js'
import ZIcon from '@/components/z-icon/z-icon.vue'
import ZFlap from '@/components/z-flap/z-flap.vue'
import ZRoomInput from '@/components/z-room-input/z-room-input.vue'
import ZEmojiPanel from '@/components/z-emoji-panel/z-emoji-panel.vue'
import ZDanmaku from '@/components/z-danmaku/z-danmaku.vue'
import ZHoldemTable from '@/components/z-holdem-table/z-holdem-table.vue'
import ZHoldemAct from '@/components/z-holdem-act/z-holdem-act.vue'
import { holdem, initHoldem, runHoldem, mySpot, join, leaveTable, myAct, createTable, removeTable, setAssets } from '@/common/holdem-room.js'
import { getNavMetrics, goBackOrHome } from '@/common/nav.js'
import { fitsDisplay } from '@/common/font-coverage.js'
import { me, room } from '@/mock/data.js'
import { chat, sendText, sendImage, addSystem, startDemoFeed, stopDemoFeed } from '@/common/room-chat.js'
import { insertAt, deleteBefore } from '@/common/emoji.js'

const noop = () => {}
const toast = (title) => uni.showToast({ title, icon: 'none' })
const pad2 = (n) => (n < 10 ? '0' : '') + n
const mmss = (sec) => { const m = Math.min(99, Math.floor(sec / 60)); return pad2(m) + ':' + pad2(sec % 60) }
const hhmm = (ms) => { const d = new Date(ms); return pad2(d.getHours()) + ':' + pad2(d.getMinutes()) }
const fmtNum = (n) => {
  if (!n) return '—'
  if (n >= 10000) return (Math.round(n / 1000) / 10) + '万'
  return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ',')
}

/* ---------- 身份：房主和共同主持是主持人；?role=player 可以预览玩家看到的样子 ---------- */
const asPlayer = ref(false)
const isHost = computed(() => !asPlayer.value && room.hosts.some((h) => h.name === me.nickname))
onLoad((q) => {
  if (!requireLogin()) return // 必须登录：未登录（比如扫码直接打开房间）转到登录页，登录后回到这里
  if (q && q.role === 'player') asPlayer.value = true
})

/* ---------- 尺寸：窄屏、常规、横屏；翻牌数字按容器宽度算，横屏或矮屏时限制高度 ---------- */
const nav = getNavMetrics()
const navStyle = `padding-top:${nav.statusBar}px;height:${nav.statusBar + nav.navH}px;padding-right:${nav.capsuleW + 8}px`
const winOf = () => { try { const w = uni.getWindowInfo ? uni.getWindowInfo() : uni.getSystemInfoSync(); return { w: w.windowWidth, h: w.windowHeight } } catch (e) { return { w: 375, h: 667 } } }
const win = ref(winOf())
const onResize = (r) => { win.value = r && r.size ? { w: r.size.windowWidth, h: r.size.windowHeight } : winOf() }
uni.onWindowResize && uni.onWindowResize(onResize)
const land = computed(() => win.value.w > win.value.h)
// 尺寸都先按实际像素算，再换成 z-flap 用的设计稿单位（375 宽的 px，组件里换算成 rpx）。
// rpx 跟着窗口宽度变，横屏时会被放大，所以这里按窗口宽度换算回去，让元素的实际大小跟着手机的短边走
const k = computed(() => win.value.w / 375) // 设计稿 px → 实际 px
const sc = computed(() => Math.min(win.value.w, win.value.h) / 375) // 实际大小跟着手机短边缩放
// Timer 页里除翻牌数字以外的高度（标签行、进度条、盲注一行、内边距、分页点），这些是固定的 px，只有盲注的翻牌跟着缩放
const fixedH = computed(() => 150 + 24 * sc.value)
// 展示区最多能用的高度：竖屏占窗口的 56%；横屏是左栏去掉状态栏和成员行以后剩下的
const stageCap = computed(() => (land.value ? win.value.h - (nav.statusBar + nav.navH) - 40 - 56 - 8 : Math.round(win.value.h * 0.56)))
// 翻牌数字：四位数字 + 冒号占满展示区的宽度；同时不超过窗口高度的 26%（横屏 30%），也不能让 Timer 页超出展示区
const flapPx = computed(() => {
  const colW = land.value ? win.value.w * 0.56 : win.value.w
  let w = (colW - 24 - 24 - 12 - 22) / 4 // 左右边距、卡片内边距、两个字间距、冒号
  let h = w * 1.62
  const maxH = Math.min(win.value.h * (land.value ? 0.3 : 0.26), stageCap.value - fixedH.value)
  if (h > maxH) { h = Math.max(36, maxH); w = h / 1.62 }
  return { w, h }
})
const flap = computed(() => ({ w: Math.round(flapPx.value.w / k.value), h: Math.round(flapPx.value.h / k.value), fs: Math.round((flapPx.value.h * 1.08) / k.value) }))
const bflap = computed(() => ({ w: Math.round((46 * sc.value) / k.value), h: Math.round((24 * sc.value) / k.value), fs: Math.round((20 * sc.value) / k.value) }))
// 展示区的高度（px）：所有分页一样大，正好放下 Timer 页；签到墙、玩法页内容长了在页面里滚动
const stageH = computed(() => Math.min(Math.round(flapPx.value.h + fixedH.value), stageCap.value))
const wallCols = computed(() => Math.max(4, Math.floor((land.value ? win.value.w * 0.56 : win.value.w) / 72)))
const wallCol = computed(() => (100 / wallCols.value).toFixed(3) + '%')

/* ---------- 计时引擎（演示：本地时钟推算；正式环境以服务端快照为准） ---------- */
let levelNo = 0
const S = room.structure.map((e) => (e.type === 'level' ? { ...e, no: ++levelNo } : { ...e }))
const idx = ref(room.startIndex)
const remaining = ref(room.remainingSec)
const now = ref(Date.now())
const paused = ref(false)
let endAt = Date.now() + room.remainingSec * 1000
const usedBefore = S.slice(0, room.startIndex).reduce((sum, e) => sum + e.dur, 0)
const startedAt = Date.now() - (usedBefore + S[room.startIndex].dur - room.remainingSec) * 1000
const cur = computed(() => S[idx.value])
const isBreak = computed(() => cur.value.type === 'break')
const nextLevel = computed(() => S.slice(idx.value + 1).find((e) => e.type === 'level'))
// 计时器状态机：
//   level（普通级别，白色）→ 本级剩 30 秒时进入 ending（白色，呼吸闪烁）→ 时间到：下一级 level，或者 break（休息，绿色，不闪）
//   break → 时间到 → level；暂停（paused，灰色）和连接中断（offline，红色）优先显示，恢复后回到原来的状态
const ENDING_SEC = 30
const TIMER_STATES = {
  level: { text: '进行中', color: '#F3EEE6', digit: '#F3EEE6', breathe: false },
  ending: { text: '即将切级', color: '#FFC53A', digit: '#F3EEE6', breathe: true },
  break: { text: '休息中', color: '#3FCF84', digit: '#3FCF84', breathe: false },
  paused: { text: '已暂停', color: '#A9AEB8', digit: '#A9AEB8', breathe: false },
  offline: { text: '连接中断', color: '#FF6B6B', digit: '#F3EEE6', breathe: false }
}
const timerState = computed(() => (!chat.online ? 'offline' : paused.value ? 'paused' : isBreak.value ? 'break' : remaining.value <= ENDING_SEC ? 'ending' : 'level'))
const tstate = computed(() => TIMER_STATES[timerState.value])
const stateInfo = tstate
const clockColor = computed(() => tstate.value.digit)
const clockText = computed(() => mmss(remaining.value))
const progress = computed(() => (((cur.value.dur - remaining.value) / cur.value.dur) * 100).toFixed(1))
const elapsedMin = computed(() => Math.max(0, Math.floor((now.value - startedAt) / 60000)))
const toBreak = computed(() => {
  let acc = remaining.value
  for (let j = idx.value + 1; j < S.length; j++) {
    if (S[j].type === 'break') return mmss(acc)
    acc += S[j].dur
  }
  return '--:--'
})
const blindOf = computed(() => (isBreak.value ? nextLevel.value : cur.value))
const blindItems = computed(() => {
  const e = blindOf.value
  return [
    { label: isBreak.value ? '下一级小盲' : '小盲', value: e ? fmtNum(e.sb) : '—' },
    { label: '大盲', value: e ? fmtNum(e.bb) : '—' },
    { label: '前注', value: e ? fmtNum(e.ante) : '—' }
  ]
})
const blindText = computed(() => (blindOf.value ? `${fmtNum(blindOf.value.sb)}/${fmtNum(blindOf.value.bb)} · 前注 ${fmtNum(blindOf.value.ante)}` : ''))
const structOpen = ref(false)
const totalLevels = S.filter((e) => e.type === 'level').length
const fullTable = computed(() => {
  let startMs = now.value + remaining.value * 1000
  return S.map((e, k) => {
    if (k > idx.value + 1) startMs += S[k - 1].dur * 1000
    const level = e.type === 'level'
    return {
      key: k, current: k === idx.value, past: k < idx.value, isBreak: !level,
      lv: level ? pad2(e.no) : '休息',
      blinds: level ? `${fmtNum(e.sb)}/${fmtNum(e.bb)}` : e.note || '—',
      ante: level ? fmtNum(e.ante) : '',
      dur: Math.round(e.dur / 60),
      start: k === idx.value ? tstate.value.text : k < idx.value ? '已结束' : hhmm(startMs)
    }
  })
})
const toDigits = (sec) => { const t = mmss(sec); return [t[0], t[1], t[3], t[4]] }
const clockDigits = ref(toDigits(room.remainingSec))
let rippleTimers = []
function setClock(sec) {
  const next = toDigits(sec)
  let order = 0
  // 同时变化的数字从右往左依次翻，间隔 55ms
  for (let i = 3; i >= 0; i--) {
    if (clockDigits.value[i] === next[i]) continue
    const k = i
    rippleTimers.push(setTimeout(() => { clockDigits.value[k] = next[k] }, order++ * 55))
  }
}
function tick() {
  const t = Date.now()
  now.value = t
  if (paused.value) return
  let rem = Math.ceil((endAt - t) / 1000)
  while (rem <= 0 && idx.value < S.length - 1) {
    idx.value += 1
    endAt += S[idx.value].dur * 1000
    rem = Math.ceil((endAt - t) / 1000)
  }
  remaining.value = Math.max(0, rem)
  setClock(remaining.value)
}
let timer = null
const start = () => { stop(); tick(); timer = setInterval(tick, 1000) }
const stop = () => {
  if (timer) clearInterval(timer)
  timer = null
  rippleTimers.forEach(clearTimeout)
  rippleTimers = []
}
// 开发用：长按 Timer 跳到本级最后 15 秒，方便看最后一分钟变色和换级翻牌
function jumpToEnd() {
  if (paused.value) return
  endAt = Date.now() + 15000
  tick()
  toast('演示：跳到本级最后 15 秒')
}
// 主持人：暂停 / 继续、上一级 / 下一级、加减时间
function togglePause() {
  if (paused.value) { endAt = Date.now() + remaining.value * 1000; paused.value = false; addSystem('主持人继续了计时') }
  else { paused.value = true; addSystem('主持人暂停了计时') }
  tick()
}
function stepLevel(d) {
  const n = Math.max(0, Math.min(S.length - 1, idx.value + d))
  if (n === idx.value) return
  idx.value = n
  remaining.value = S[n].dur
  endAt = Date.now() + S[n].dur * 1000
  setClock(remaining.value)
  addSystem(`主持人把计时切到了${S[n].type === 'break' ? '休息' : '第 ' + S[n].no + ' 级'}`)
}
function addTime(sec) {
  const next = Math.max(10, remaining.value + sec)
  remaining.value = next
  endAt = Date.now() + next * 1000
  setClock(next)
  toast(sec > 0 ? '本级加了 1 分钟' : '本级减了 1 分钟')
}

/* ---------- 成员：座位上的人 + 已签到候补；签到墙、成员概览、记分都用 ---------- */
const members = ref(room.seats.map((s) => ({ name: s.name, c: s.c, bg: s.bg, fg: s.fg, seat: s.no })).concat(room.waiting.map((p) => ({ ...p, seat: 0 }))))
// 抽座位：打乱后前 9 位入座（1 到 9 号），其余候补
function shuffleSeats() {
  const list = members.value.slice()
  for (let i = list.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); const t = list[i]; list[i] = list[j]; list[j] = t }
  members.value = list.map((m, i) => ({ ...m, seat: i < 9 ? i + 1 : 0 }))
  addSystem('主持人重新抽了座位，签到墙上可以看到座位号')
  toast('已重新抽座位')
}

/* ---------- 内容展示区：分页按 key 记，开关玩法时停在原来的页面 ---------- */
const PLAYS = [
  { key: 'holdem', name: '经典德扑', icon: 'cards', desc: '主持人开桌，玩家入座后按顺序出分' },
  { key: 'ticker', name: '走字灯', icon: 'speakerphone', desc: '滚动显示房间公告和最新消息' },
  { key: 'pot', name: '边池计算', icon: 'calculator', desc: '按每人投入分出主池和边池' }
]
const playsOn = ref([])
const pages = computed(() => [{ key: 'wall' }, { key: 'timer' }].concat(PLAYS.filter((p) => playsOn.value.includes(p.key)).map((p) => ({ key: p.key }))))
const pageKey = ref('timer')
const pageIdx = computed(() => Math.max(0, pages.value.findIndex((p) => p.key === pageKey.value)))
function onPage(e) {
  const p = pages.value[e.detail.current]
  if (p) pageKey.value = p.key
}
function togglePlay(pl) {
  if (!isHost.value) return
  if (playsOn.value.includes(pl.key)) {
    playsOn.value = playsOn.value.filter((k) => k !== pl.key)
    if (pageKey.value === pl.key) pageKey.value = 'timer' // 关掉的正是当前页：回到 Timer
    addSystem(`主持人关闭了「${pl.name}」`)
  } else {
    playsOn.value = PLAYS.filter((p) => p.key === pl.key || playsOn.value.includes(p.key)).map((p) => p.key)
    addSystem(`主持人开启了「${pl.name}」，在 Timer 后面左右滑动查看`)
  }
}

/* ---------- 玩法：经典德扑（牌局在 common/holdem-room.js 里跑；资产就是记分） ---------- */
const ME_NAME = me.nickname
initHoldem(members.value, ME_NAME, room.startScore)
const holdemOn = computed(() => playsOn.value.includes('holdem'))
const spot = computed(() => (holdemOn.value ? mySpot() : null))
const seatedOf = (t) => t.seats.filter(Boolean).length
// 盲注跟着房间当前的级别（休息时用下一级），下一手开始生效
watch(blindOf, (e) => { if (e) holdem.blinds = { sb: e.sb, bb: e.bb, ante: e.ante || 0 } }, { immediate: true })
watch(holdemOn, (on) => runHoldem(on && pageShown.value))
const pageShown = ref(true)
function joinHoldem(t) {
  const err = join(t.id)
  if (err) return toast(err)
  addSystem(`${ME_NAME} 坐上了${t.name}`)
}
function leaveHoldem() {
  uni.showModal({
    title: '离开牌桌',
    content: '这一手还没结束的话，离桌算弃牌。',
    confirmText: '离桌',
    success: ({ confirm }) => { if (confirm) leaveTable() }
  })
}
function onHoldemAct(action, to) {
  const err = myAct(action, to)
  if (err) toast(err)
}
const newSize = ref(9)
function addTable() {
  if (!isHost.value) return
  const t = createTable(newSize.value)
  addSystem(`主持人开了${t.name}（${t.size} 人桌）`)
}
function deleteTable(t) {
  uni.showModal({
    title: '删除' + t.name,
    content: seatedOf(t) ? '桌上的人会离座，正在进行的这一手退回投入。' : '删除这张空桌？',
    confirmText: '删除',
    confirmColor: '#D9534F',
    success: ({ confirm }) => { if (confirm) { removeTable(t.id); addSystem(`主持人关闭了${t.name}`) } }
  })
}
// 调整资产（主持人点玩法面板里的玩家头像）
const assetsEdit = ref(null)
const assetsDraft = ref('')
function openAssets(m) {
  if (!isHost.value) return toast('只有主持人可以调整资产')
  assetsEdit.value = m
  assetsDraft.value = String(holdem.assets[m.name] || 0)
}
function saveAssets() {
  const m = assetsEdit.value
  setAssets(m.name, assetsDraft.value)
  addSystem(`主持人把 ${m.name} 的资产调整为 ${fmtNum(holdem.assets[m.name])}`)
  assetsEdit.value = null
}

/* ---------- 玩法：走字灯（公告 + 最近的消息） ---------- */
const notice = ref(room.notice)
const noticeDraft = ref(room.notice)
function publishNotice() {
  const t = noticeDraft.value.trim()
  if (!t || t === notice.value) return
  notice.value = t
  addSystem('主持人更新了公告：' + t)
  toast('公告已发布')
}
const tickerItems = computed(() => {
  const msgs = chat.list.filter((m) => m.kind === 'text').slice(-4).map((m) => ({ type: 'danmaku', label: m.from.name + '：' + m.text }))
  const one = [{ type: 'notice', label: '【公告】' + notice.value }].concat(msgs)
  return one.concat(one).map((t, i) => ({ ...t, key: i }))
})
const tickerDur = computed(() => {
  const half = tickerItems.value.slice(0, tickerItems.value.length / 2)
  return Math.max(10, Math.round(half.reduce((sum, t) => sum + t.label.length * 22 + 56, 0) / 45))
})

/* ---------- 玩法：边池计算 ---------- */
const potRows = ref(room.seats.map((s) => ({ name: s.name, amount: '' })))
function setPot(i, e) { potRows.value[i].amount = String(e.detail.value || '').replace(/\D/g, '') }
const pots = computed(() => {
  const ins = potRows.value.map((r) => ({ name: r.name, v: Number(r.amount) || 0 })).filter((r) => r.v > 0)
  const levels = [...new Set(ins.map((r) => r.v))].sort((a, b) => a - b)
  let prev = 0
  return levels.map((lv) => {
    const who = ins.filter((r) => r.v >= lv)
    const pot = { amount: (lv - prev) * who.length, who: who.map((r) => r.name) }
    prev = lv
    return pot
  }).filter((p) => p.amount > 0)
})

/* ---------- 记分：和经典德扑的资产是同一份 ---------- */
const ranked = computed(() => members.value.map((m) => ({ ...m, score: holdem.assets[m.name] || 0 })).sort((a, b) => b.score - a.score))
const totalScore = computed(() => ranked.value.reduce((a, s) => a + s.score, 0))
const avgScore = computed(() => Math.round(totalScore.value / Math.max(1, ranked.value.length)))
function adjustScore(s, d) {
  if (!isHost.value) return
  setAssets(s.name, Math.max(0, (holdem.assets[s.name] || 0) + d))
}

/* ---------- 消息：气泡弹幕和完整列表共用一份数据 ---------- */
const danmakuList = computed(() => chat.list.slice(-6))
const openChat = () => uni.navigateTo({ url: '/pages/room/chat' })
const draft = ref('')
const cursor = ref(-1)
const failed = ref(false)
const focusKey = ref(0)
const panel = ref('none') // none / emoji
const kb = ref(0)
const compact = computed(() => kb.value > 0 || panel.value === 'emoji')
// 键盘弹出时输入栏顶在键盘上面；表情面板和抽屉自带底部安全区；都没有时留出底部安全区
const bottomStyle = computed(() => (kb.value > 0 ? `padding-bottom:${kb.value}px` : panel.value === 'emoji' || drawer.show ? '' : 'padding-bottom:env(safe-area-inset-bottom)'))
watch(draft, () => { if (failed.value) failed.value = false })
async function send() {
  const text = draft.value.trim()
  if (!text) return
  failed.value = false
  const ok = await sendText(text)
  if (ok) {
    draft.value = ''
    cursor.value = 0
  } else {
    // 发送失败：内容留在输入框，按钮变成重试
    nextTick(() => { failed.value = true })
    toast('发送失败，点右边的按钮重试')
  }
}
function onKb(h) {
  kb.value = h
  if (h) panel.value = 'none'
}
function onInputFocus() {
  panel.value = 'none'
  if (drawer.show) closeDrawer()
}
const cursorPos = () => (cursor.value >= 0 && cursor.value <= draft.value.length ? cursor.value : draft.value.length)
// 表情 ⇄ 键盘：切换时保留草稿和光标位置
function toggleEmoji() {
  if (panel.value === 'emoji') {
    panel.value = 'none'
    focusKey.value += 1
    return
  }
  if (drawer.show) closeDrawer()
  uni.hideKeyboard()
  kb.value = 0
  panel.value = 'emoji'
}
function pickEmoji(e) {
  const r = insertAt(draft.value, cursorPos(), e)
  draft.value = r.text
  cursor.value = r.cursor
}
function delEmoji() {
  const r = deleteBefore(draft.value, cursorPos())
  draft.value = r.text
  cursor.value = r.cursor
}

/* ---------- 更多抽屉 ---------- */
const TABS = [
  { key: 'image', name: '图片', icon: 'photo' },
  { key: 'chat', name: '弹幕', icon: 'message-circle' },
  { key: 'host', name: '主持人', icon: 'crown' },
  { key: 'play', name: '玩法', icon: 'puzzle' },
  { key: 'score', name: '记分', icon: 'trophy' }
]
const drawer = reactive({ show: false, open: false, tab: 'image', dir: 'r', drag: 0 })
let drawerTimer = null
function openDrawer() {
  uni.hideKeyboard()
  kb.value = 0
  panel.value = 'none'
  clearTimeout(drawerTimer)
  drawer.show = true
  drawer.drag = 0
  setTimeout(() => { drawer.open = true }, 20)
}
function closeDrawer() {
  drawer.open = false
  drawer.drag = 0
  clearTimeout(drawerTimer)
  drawerTimer = setTimeout(() => { drawer.show = false }, 240)
}
const toggleMore = () => (drawer.show && drawer.open ? closeDrawer() : openDrawer())
function pickTab(key) {
  // 「弹幕」：收起抽屉，打开完整的房间弹幕列表
  if (key === 'chat') {
    closeDrawer()
    setTimeout(openChat, 160)
    return
  }
  const from = TABS.findIndex((t) => t.key === drawer.tab)
  const to = TABS.findIndex((t) => t.key === key)
  drawer.dir = to >= from ? 'r' : 'l'
  drawer.tab = key
}
// 下滑抽屉关闭：只在顶部拖拽条区域响应
let dragY = null
function dragStart(e) { dragY = e.touches[0].clientY }
function dragMove(e) {
  if (dragY === null) return
  drawer.drag = Math.max(0, e.touches[0].clientY - dragY)
}
function dragEnd() {
  if (dragY === null) return
  dragY = null
  if (drawer.drag > 90) closeDrawer()
  else drawer.drag = 0
}
// 照片：选出来的放进宫格（最新的在前），点选后一起发；微信不允许小程序直接读取相册
const photos = ref([])
const photoSel = ref([])
function pickPhotos(src) {
  const add = (paths) => {
    const list = (paths || []).filter(Boolean)
    if (!list.length) return
    photos.value = list.concat(photos.value.filter((p) => !list.includes(p))).slice(0, 30)
    photoSel.value = list.concat(photoSel.value.filter((p) => !list.includes(p))).slice(0, 9)
  }
  // #ifdef MP-WEIXIN
  uni.chooseMedia({ count: src === 'camera' ? 1 : 9, mediaType: ['image'], sourceType: [src], sizeType: ['compressed'], success: (r) => add((r.tempFiles || []).map((f) => f.tempFilePath)) })
  // #endif
  // #ifndef MP-WEIXIN
  uni.chooseImage({ count: src === 'camera' ? 1 : 9, sourceType: [src], success: (r) => add(r.tempFilePaths) })
  // #endif
}
function togglePhoto(p) {
  if (photoSel.value.includes(p)) photoSel.value = photoSel.value.filter((x) => x !== p)
  else if (photoSel.value.length >= 9) toast('一次最多发 9 张')
  else photoSel.value = photoSel.value.concat([p])
}
const previewPhoto = (p) => uni.previewImage({ urls: photos.value, current: p })
function sendPhotos() {
  const n = photoSel.value.length
  photoSel.value.forEach((p) => sendImage(p))
  photoSel.value = []
  closeDrawer()
  toast(`已发送 ${n} 张照片`)
}

onShow(() => { start(); startDemoFeed('room'); pageShown.value = true; runHoldem(holdemOn.value) })
onHide(() => { stop(); stopDemoFeed('room'); pageShown.value = false; runHoldem(false) })
onUnload(() => { stop(); stopDemoFeed('room'); runHoldem(false); uni.offWindowResize && uni.offWindowResize(onResize) })
onShareAppMessage(() => ({ title: `${room.name}，${room.table} 号桌等你入座`, path: '/pages/invite/index' }))
</script>

<style>
/* 页面深灰、输入栏和抽屉略亮、Timer 接近黑色；主要文字暖白，辅助文字清楚的灰；间距以 8px 为单位 */
.room { position: relative; height: 100vh; display: flex; flex-direction: column; overflow: hidden; background: #1B1D22; }
.press { opacity: .8; }
.press-soft { opacity: .85; }
.font-sys { font-family: "PingFang SC", sans-serif !important; font-weight: 700; }
.nav { flex: none; padding-left: 12px; box-sizing: border-box; display: flex; align-items: center; }
.nav-back { width: 44px; height: 44px; flex: none; border-radius: 50%; background: #2C2F36; display: flex; align-items: center; justify-content: center; }
.nav-name { margin-left: 12px; flex: 1; min-width: 0; font-family: "ZZDisplay", "PingFang SC", sans-serif; font-size: 24px; color: #F3EEE6; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.main { flex: 1; min-height: 0; display: flex; flex-direction: column; }
.col-a { flex: none; display: flex; flex-direction: column; }
.col-b { flex: 1; min-height: 0; display: flex; flex-direction: column; }
/* 赛事状态栏 */
.status { height: 40px; padding: 0 16px; display: flex; align-items: center; }
.st-lv { font-family: "ZZDisplay", "PingFang SC", sans-serif; font-size: 22px; color: #F3EEE6; }
.st-el { margin-left: 8px; font-size: 13px; color: #A9AEB8; }
.st-state { margin-left: auto; display: flex; align-items: center; font-size: 15px; font-weight: 600; }
.st-dot { width: 8px; height: 8px; margin-right: 6px; border-radius: 50%; }
/* 摘要（键盘或表情面板打开时） */
.summary { height: 0; margin: 0 12px; padding: 0 16px; border-radius: 16px; background: #0D0E11; overflow: hidden; opacity: 0; display: flex; align-items: center; transition: height 240ms ease, opacity 200ms ease; }
.summary-on { height: 48px; opacity: 1; }
.sm-time { font-family: "BoardNum", sans-serif; font-weight: 800; font-size: 24px; }
.sm-b { margin-left: 12px; flex: 1; min-width: 0; font-size: 14px; color: #F3EEE6; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.sm-s { margin-left: 8px; font-size: 13px; font-weight: 600; }
/* 内容展示区 */
.stage { position: relative; margin: 0 12px; border-radius: 16px; background: #0D0E11; overflow: hidden; display: flex; flex-direction: column; transition: height 240ms ease, opacity 200ms ease; }
.stage-hide { height: 0 !important; opacity: 0; }
.pages { width: 100%; flex: 1; min-height: 0; }
.pg { height: 100%; box-sizing: border-box; }
.dots { height: 24px; flex: none; display: flex; align-items: center; justify-content: center; }
.dot { width: 6px; height: 6px; margin: 0 4px; border-radius: 3px; background: #4B4F58; transition: width 240ms ease, background 240ms ease; }
.dot-on { width: 18px; background: #F3EEE6; }
/* 签到墙 */
.wall { padding: 16px 8px 32px; }
.wall-t { display: block; text-align: center; font-family: "ZZDisplay", "PingFang SC", sans-serif; font-size: 24px; color: #F3EEE6; }
.wall-grid { margin-top: 16px; display: flex; flex-wrap: wrap; }
.wall-i { margin: 0 0 12px; padding: 0; line-height: normal; background: transparent; display: flex; flex-direction: column; align-items: center; }
.wall-i::after { border: none; }
.wall-av { position: relative; width: 48px; height: 48px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 18px; font-weight: 600; }
.wall-seat { position: absolute; right: -4px; bottom: -4px; min-width: 18px; height: 18px; padding: 0 4px; box-sizing: border-box; border-radius: 9px; background: #F3EEE6; color: #0D0E11; font-size: 11px; font-weight: 700; text-align: center; line-height: 18px; }
.wall-av-inv { background: #33363E; }
.wall-n { margin-top: 6px; max-width: 100%; font-size: 12px; color: #E5E2DB; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.wall-n-inv { color: #A9AEB8; }
/* Timer */
.tm { padding: 12px 12px 8px; }
.tm-top { height: 28px; display: flex; align-items: center; justify-content: space-between; }
.tm-tag { padding: 2px 8px; border-radius: 6px; background: #2D5BD8; font-size: 13px; font-weight: 700; color: #FFFFFF; }
.tm-brk { display: flex; align-items: baseline; }
.tm-brk-k { font-size: 13px; color: #A9AEB8; }
.tm-brk-v { margin-left: 6px; font-family: "BoardNum", sans-serif; font-weight: 800; font-size: 20px; color: #F3EEE6; }
.clock { margin-top: 8px; display: flex; align-items: center; justify-content: center; }
.clock-gap { width: 6px; }
.colon { width: 22px; display: flex; flex-direction: column; align-items: center; }
.colon-dot { width: 6px; height: 6px; margin: 5px 0; border-radius: 1px; }
.prog { height: 4px; margin: 16px 24px 0; border-radius: 2px; background: #2C2F36; overflow: hidden; }
.prog-fill { height: 100%; border-radius: 2px; background: #F3EEE6; transition: width 1s linear; }
.tm-row { margin-top: 16px; display: flex; align-items: flex-start; justify-content: space-around; }
.tm-struct { width: 56px; height: 52px; display: flex; flex-direction: column; align-items: center; justify-content: center; }
.tm-struct-t { margin-top: 4px; font-size: 12px; color: #C9CDD4; }
.bl { display: flex; flex-direction: column; align-items: center; }
.bl-cap { margin-top: 6px; font-size: 12px; color: #C9CDD4; }
.tr { height: 36px; display: flex; align-items: center; border-bottom: 1px solid #22252B; }
.tr-head { height: 28px; }
.tr-head .tc { font-size: 12px; color: #8E929B; }
.tr-cur { background: #1D2027; }
.tr-past .tc { color: #6E737C; }
.tr-break .tc { color: #3FCF84; }
/* 计时器：本级最后 30 秒呼吸闪烁 */
.clock-breathe { animation: breathe 1.6s ease-in-out infinite; }
@keyframes breathe { 0%, 100% { opacity: 1; } 50% { opacity: .38; } }
/* 盲注表、调整资产：全屏浮层，暗色遮罩 + 背景模糊 */
.bt { position: fixed; z-index: 260; left: 0; top: 0; right: 0; bottom: 0; background: rgba(8, 9, 12, .55); -webkit-backdrop-filter: blur(14px); backdrop-filter: blur(14px); display: flex; align-items: center; justify-content: center; animation: bt-in 220ms ease; }
@keyframes bt-in { from { opacity: 0; } to { opacity: 1; } }
.bt-card { width: calc(100% - 32px); max-width: 480px; max-height: 78vh; padding: 16px 12px 8px; box-sizing: border-box; border-radius: 16px; background: #111317; display: flex; flex-direction: column; animation: bt-up 240ms cubic-bezier(.2, .8, .2, 1); }
@keyframes bt-up { from { transform: translateY(16px) scale(.98); } to { transform: none; } }
.bt-head { padding: 0 4px 8px; display: flex; align-items: baseline; justify-content: space-between; }
.bt-title { font-size: 17px; font-weight: 700; color: #F3EEE6; }
.bt-sub { font-size: 12px; color: #A9AEB8; }
.bt-body { flex: 1; min-height: 0; max-height: calc(78vh - 96px); }
.tc { flex: 1; text-align: center; font-size: 13px; color: #E5E2DB; }
/* 玩法页 */
.play { padding: 16px 16px 32px; }
.play-t { display: block; font-size: 16px; font-weight: 700; color: #F3EEE6; }
.play-s { display: block; margin-top: 12px; font-size: 12px; color: #A9AEB8; }
.play-s-top { margin-top: 4px; margin-bottom: 8px; }
.play-acts { margin-top: 16px; display: flex; justify-content: center; }
.ticker { margin-top: 24px; height: 44px; border-radius: 8px; background: #17191E; overflow: hidden; display: flex; align-items: center; }
.mq { display: flex; white-space: nowrap; animation: mq-run linear infinite; }
@keyframes mq-run { from { transform: translateX(0); } to { transform: translateX(-50%); } }
.mq-msg { margin-right: 28px; font-size: 16px; }
.mq-notice { color: #FFC53A; }
.mq-danmaku { color: #F3EEE6; }
/* 经典德扑：牌桌列表 */
.hp { min-height: 100%; }
.tl { padding: 16px 12px 24px; }
.tl-head { display: flex; align-items: baseline; justify-content: space-between; }
.tl-me { font-size: 12px; color: #A9AEB8; }
.tl-card { margin-top: 12px; padding: 12px; border-radius: 12px; background: #17191E; }
.tl-top { display: flex; align-items: center; }
.tl-main { flex: 1; min-width: 0; display: flex; flex-direction: column; }
.tl-name { font-size: 15px; font-weight: 700; color: #F3EEE6; }
.tl-sub { margin-top: 2px; font-size: 12px; color: #A9AEB8; }
.tl-join { height: 36px; padding: 0 16px; border-radius: 18px; background: #5865F2; display: flex; align-items: center; }
.tl-join-off { background: #2C2F36; }
.tl-join-t { font-size: 14px; font-weight: 600; color: #FFFFFF; }
.tl-seats { margin-top: 10px; display: flex; flex-wrap: wrap; }
.tl-seat { width: 24px; height: 24px; margin: 0 4px 4px 0; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 600; }
.tl-seat-empty { border: 1px dashed #4B4F58; box-sizing: border-box; }
.pot-r { height: 44px; display: flex; align-items: center; border-bottom: 1px solid #22252B; }
.pot-n { flex: 1; font-size: 14px; color: #E5E2DB; }
.pot-in { width: 120px; height: 32px; padding: 0 8px; border-radius: 8px; background: #22252B; text-align: right; font-size: 15px; color: #F3EEE6; }
.pot-ph { color: #6E737C; }
.pot-res { margin-top: 12px; padding: 12px; border-radius: 12px; background: #17191E; display: flex; flex-wrap: wrap; align-items: baseline; }
.pot-res-k { font-size: 14px; color: #C9CDD4; }
.pot-res-v { margin-left: 8px; font-family: "BoardNum", sans-serif; font-weight: 800; font-size: 20px; color: #F3EEE6; }
.pot-res-s { width: 100%; margin-top: 4px; font-size: 12px; color: #A9AEB8; }
/* 成员概览 */
.members { height: 56px; padding: 0 16px; display: flex; align-items: center; }
.stack { display: flex; }
.sk-av { position: relative; width: 36px; height: 36px; margin-right: -10px; border-radius: 50%; border: 2px solid #1B1D22; display: flex; align-items: center; justify-content: center; font-size: 14px; font-weight: 600; }
.mb-n { margin-left: 18px; font-family: "BoardNum", sans-serif; font-weight: 800; font-size: 22px; color: #F3EEE6; }
.mb-s { margin-left: 8px; font-size: 12px; color: #A9AEB8; }
/* 气泡弹幕区：在成员概览和输入栏之间，靠左、贴着下沿 */
.dm-area { flex: 1; min-height: 0; padding: 0 16px 8px; overflow: hidden; display: flex; flex-direction: column; justify-content: flex-end; -webkit-mask-image: linear-gradient(to bottom, transparent 0, #000 28px); mask-image: linear-gradient(to bottom, transparent 0, #000 28px); }
.bottom { flex: none; background: #1B1D22; transition: padding-bottom 200ms ease; }
/* 横屏：左边赛事区，右边交流区 */
.room-land .main { flex-direction: row; }
.room-land .col-a { width: 56%; }
.room-land .col-b { width: 44%; }
/* 更多抽屉：在输入栏下面；打开时输入栏和抽屉一起浮在屏幕底部（遮罩上面），原位置留一个同样高的占位 */
.bottom-top { position: fixed; z-index: 160; left: 0; right: 0; bottom: 0; }
.room-land .bottom-top { left: 56%; }
.bottom-spacer { flex: none; height: calc(64px + env(safe-area-inset-bottom)); }
.dr-mask { position: fixed; z-index: 150; left: 0; top: 0; right: 0; bottom: 0; background: rgba(0, 0, 0, 0); transition: background 240ms ease; }
.dr-mask-on { background: rgba(0, 0, 0, .55); }
.dr-sheet { max-height: 0; overflow: hidden; background: #2C2F36; border-radius: 16px 16px 0 0; display: flex; flex-direction: column; transition: max-height 260ms cubic-bezier(.2, .8, .2, 1); }
.dr-on { max-height: 64vh; }
.dr-grab-area { height: 24px; flex: none; display: flex; align-items: center; justify-content: center; }
.dr-grab { width: 36px; height: 4px; border-radius: 2px; background: #4B4F58; }
.dr-body { flex: 1; min-height: 0; max-height: calc(64vh - 24px - 88px); }
.dr-panel { padding: 0 16px 16px; animation-duration: 240ms; animation-timing-function: cubic-bezier(.2, .8, .2, 1); }
.dr-from-r { animation-name: dr-in-r; }
.dr-from-l { animation-name: dr-in-l; }
@keyframes dr-in-r { from { transform: translateX(32px); opacity: 0; } to { transform: none; opacity: 1; } }
@keyframes dr-in-l { from { transform: translateX(-32px); opacity: 0; } to { transform: none; opacity: 1; } }
.dp-t { display: block; font-size: 17px; font-weight: 700; color: #F3EEE6; }
.dp-h { display: block; margin-top: 16px; font-size: 13px; color: #A9AEB8; }
.dp-s { display: block; margin-top: 16px; font-size: 12px; color: #A9AEB8; }
/* 照片宫格 */
.ph-head { display: flex; align-items: baseline; justify-content: space-between; }
.ph-clear { font-size: 13px; color: #C9CDD4; }
.ph-grid { margin-top: 12px; display: flex; flex-wrap: wrap; }
.ph-cell { position: relative; width: calc(25% - 3px); height: 0; padding-bottom: calc(25% - 3px); margin: 0 4px 4px 0; border-radius: 8px; overflow: hidden; background: #383C45; }
.ph-cell:nth-child(4n) { margin-right: 0; }
.ph-tool { position: absolute; left: 0; top: 0; right: 0; bottom: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; }
.ph-tool-t { margin-top: 4px; font-size: 12px; color: #C9CDD4; }
.ph-img { position: absolute; left: 0; top: 0; width: 100%; height: 100%; }
.ph-ck { position: absolute; right: 6px; top: 6px; width: 22px; height: 22px; box-sizing: border-box; border-radius: 50%; border: 2px solid rgba(255, 255, 255, .9); background: rgba(0, 0, 0, .25); display: flex; align-items: center; justify-content: center; }
.ph-ck-on { border-color: #5865F2; background: #5865F2; }
.ph-ck-t { font-size: 12px; font-weight: 700; color: #FFFFFF; }
.ph-send { margin-top: 12px; height: 44px; border-radius: 12px; background: #5865F2; display: flex; align-items: center; justify-content: center; }
.ph-send-t { font-size: 15px; font-weight: 600; color: #FFFFFF; }
/* 主持人：牌桌管理；玩法：玩家资产 */
.tb-row { height: 48px; display: flex; align-items: center; border-bottom: 1px solid #383C45; }
.tb-n { font-size: 15px; font-weight: 600; color: #F3EEE6; }
.tb-s { margin-left: 8px; flex: 1; font-size: 12px; color: #A9AEB8; }
.tb-del { height: 32px; padding: 0 12px; border-radius: 8px; background: #383C45; display: flex; align-items: center; }
.tb-del-t { font-size: 13px; color: #FF8A8A; }
.sz-row { margin-top: 12px; display: flex; }
.sz { flex: 1; height: 36px; margin-right: 4px; border-radius: 8px; background: #383C45; text-align: center; line-height: 36px; font-family: "BoardNum", sans-serif; font-weight: 800; font-size: 15px; color: #C9CDD4; }
.sz:last-child { margin-right: 0; }
.sz-on { background: #F3EEE6; color: #181A20; }
.tb-add { margin-top: 8px; height: 44px; border-radius: 12px; background: #5865F2; display: flex; align-items: center; justify-content: center; }
.tb-add-t { margin-left: 6px; font-size: 14px; font-weight: 600; color: #FFFFFF; }
.as-grid { margin-top: 8px; display: flex; flex-wrap: wrap; }
.as-i { width: 25%; margin-bottom: 12px; display: flex; flex-direction: column; align-items: center; }
.as-av { width: 44px; height: 44px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 16px; font-weight: 600; }
.as-av-l { width: 48px; height: 48px; }
.as-n { margin-top: 4px; font-size: 12px; color: #E5E2DB; }
.as-v { font-family: "BoardNum", sans-serif; font-weight: 800; font-size: 13px; color: #F3EEE6; }
.as-card { width: calc(100% - 48px); max-width: 420px; padding: 20px 16px 16px; box-sizing: border-box; border-radius: 16px; background: #1F222A; animation: bt-up 240ms cubic-bezier(.2, .8, .2, 1); }
.as-head { display: flex; align-items: center; }
.as-title { margin-left: 12px; font-size: 17px; font-weight: 700; color: #F3EEE6; }
.as-in { margin-top: 16px; height: 52px; padding: 0 12px; border-radius: 12px; background: #2C2F36; font-family: "BoardNum", sans-serif; font-weight: 800; font-size: 24px; color: #F3EEE6; }
.as-quick { margin-top: 8px; display: flex; }
.as-q { flex: 1; height: 36px; margin-right: 6px; border-radius: 8px; background: #2C2F36; text-align: center; line-height: 36px; font-size: 13px; color: #F3EEE6; }
.as-q:last-child { margin-right: 0; }
.as-acts { margin-top: 16px; display: flex; }
.as-btn { flex: 1; height: 44px; border-radius: 12px; background: #2C2F36; display: flex; align-items: center; justify-content: center; }
.as-btn-ok { margin-left: 8px; background: #5865F2; }
.as-btn-t { font-size: 15px; font-weight: 600; color: #FFFFFF; }
.hosts { margin-top: 12px; display: flex; flex-wrap: wrap; }
.host-chip { margin: 0 8px 8px 0; height: 32px; padding: 0 12px; border-radius: 16px; background: #383C45; display: flex; align-items: center; }
.host-n { font-size: 14px; color: #F3EEE6; }
.host-r { margin-left: 6px; font-size: 12px; color: #A9AEB8; }
.hgrid { margin-top: 8px; display: flex; flex-wrap: wrap; justify-content: space-between; }
.hbtn { width: 31%; height: 64px; margin-bottom: 8px; border-radius: 12px; background: #383C45; display: flex; flex-direction: column; align-items: center; justify-content: center; }
.hbtn-t { margin-top: 4px; font-size: 13px; color: #F3EEE6; }
.notice-row { margin-top: 8px; display: flex; align-items: center; }
.notice-in { flex: 1; min-width: 0; height: 44px; padding: 0 12px; border-radius: 12px; background: #383C45; font-size: 14px; color: #F3EEE6; }
.ph { color: #8E929B; }
.pbtn { height: 44px; margin-left: 8px; padding: 0 16px; border-radius: 12px; background: #5865F2; display: flex; align-items: center; }
.pbtn-off { background: #383C45; }
.pbtn-t { margin-left: 4px; font-size: 14px; font-weight: 600; color: #FFFFFF; }
.pl-row { height: 64px; display: flex; align-items: center; border-bottom: 1px solid #383C45; }
.pl-ic { width: 40px; height: 40px; flex: none; border-radius: 12px; background: #383C45; display: flex; align-items: center; justify-content: center; }
.pl-main { flex: 1; min-width: 0; margin: 0 12px; display: flex; flex-direction: column; }
.pl-n { font-size: 15px; font-weight: 600; color: #F3EEE6; }
.pl-d { margin-top: 2px; font-size: 12px; color: #A9AEB8; }
.pl-st { font-size: 13px; color: #A9AEB8; }
.pl-st-on { color: #3FCF84; }
.sc-head { display: flex; align-items: baseline; justify-content: space-between; }
.sc-sum { font-size: 12px; color: #A9AEB8; }
.sc-row { height: 52px; display: flex; align-items: center; border-bottom: 1px solid #383C45; }
.sc-rank { width: 24px; font-family: "BoardNum", sans-serif; font-weight: 800; font-size: 16px; color: #8E929B; }
.sc-rank-top { color: #FFC53A; }
.sc-av { width: 32px; height: 32px; margin-left: 4px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 13px; font-weight: 600; }
.sc-n { flex: 1; min-width: 0; margin-left: 12px; font-size: 14px; color: #F3EEE6; }
.sc-step { display: flex; align-items: center; }
.sc-b { width: 32px; height: 32px; border-radius: 8px; background: #383C45; display: flex; align-items: center; justify-content: center; }
.sc-v { min-width: 72px; text-align: center; font-family: "BoardNum", sans-serif; font-weight: 800; font-size: 16px; color: #F3EEE6; }
/* 悬浮导航 */
.dr-nav { flex: none; margin: 8px 12px calc(12px + env(safe-area-inset-bottom)); height: 64px; padding: 0 4px; border-radius: 16px; background: #1B1D22; box-shadow: 0 8px 24px rgba(0, 0, 0, .35); display: flex; align-items: center; }
.dn { flex: 1; height: 56px; border-radius: 12px; display: flex; flex-direction: column; align-items: center; justify-content: center; transition: background 200ms ease; }
.dn-on { background: #383C45; }
.dn-t { margin-top: 2px; font-size: 12px; color: #8E929B; }
.dn-on .dn-t { color: #F3EEE6; font-weight: 600; }
</style>
