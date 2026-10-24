<template>
  <page-meta :page-style="joinOpen ? 'overflow:hidden' : ''"></page-meta>
  <view class="page">
    <!-- 封面：比赛封面 + 暗喻 -->
    <view class="hero">
      <image v-if="m.coverImage" class="hero-fill" :src="m.coverImage" mode="aspectFill" />
      <view v-else class="hero-fill hero-art" :style="heroBg"></view>
      <view v-if="!m.coverImage" class="tag">
        <text class="tag-n">{{ scene.name }}</text>
        <text class="tag-l">{{ scene.line }}</text>
      </view>
    </view>

    <!-- 滚动后出现的标题栏；从分享进入时没有上一页，左上角是「回到首页」 -->
    <view class="topbar" :class="{ 'topbar-on': scrolled }" :style="topbarStyle"><text class="topbar-t" :class="{ 'font-sys': !displayOk }">{{ m.name }}</text></view>
    <view class="nav-btn" :style="navBtnStyle" hover-class="press" @tap="leave">
      <z-icon :name="canBack ? 'arrow-left' : 'home'" :size="19" color="#FFFFFF" />
    </view>

    <view class="sheet">
      <view class="inviter">
        <view class="av av-28" :style="'background:' + m.inviter.bg + ';color:' + m.inviter.fg"><text>{{ m.inviter.c }}</text><view v-if="byHost" class="av-v"><z-icon name="letter-v" :size="7" :stroke="3.4" color="#FFFFFF" /></view></view>
        <text class="inviter-t"><text class="inviter-n">{{ m.inviter.name }}</text> 邀请你参加</text>
        <!-- 动态热度：按实时报名人数和浏览量（去掉了写死的「周五桌游夜」） -->
        <view class="inviter-heat"><z-heat :signed="signedCount" :cap="m.cap" :views="views" /></view>
      </view>
      <text class="title" :class="{ 'font-sys': !displayOk }">{{ m.name }}</text>
      <view class="chips">
        <block v-if="!shownTags.length">
          <view class="chip"><text>德州扑克</text></view>
          <view class="chip"><text>锦标赛</text></view>
          <view class="chip">
            <z-icon :name="m.isPublic ? 'world' : 'lock'" :size="13" color="#E5E7EB" />
            <text class="chip-t">{{ m.isPublic ? '公开赛' : '仅受邀' }}</text>
          </view>
        </block>
        <view class="chip">
          <z-icon :name="m.autoApprove ? 'bolt' : 'user-check'" :size="13" :color="m.autoApprove ? '#3FCF84' : '#FFC53A'" />
          <text class="chip-t" :style="{ color: m.autoApprove ? '#3FCF84' : '#FFC53A' }">{{ m.autoApprove ? '自动通过' : '需审核' }}</text>
        </view>
        <view v-for="t in shownTags" :key="t.text" class="chip chip-tag" :class="{ 'chip-pending': t.pending }"><text>#{{ t.text }}</text><text v-if="t.pending" class="chip-st">审核中</text></view>
      </view>

      <!-- 关键信息板：站牌风格，和房间页的翻牌钟一致 -->
      <view class="board">
        <view class="bd-top">
          <view>
            <text class="bk">开赛</text>
            <view class="bd-flaps">
              <z-flap :value="clock[0]" :w="30" :h="46" :fs="50" :hinge="2" :pin="4" :stack="4" />
              <view class="gap"></view>
              <z-flap :value="clock[1]" :w="30" :h="46" :fs="50" :hinge="2" :pin="4" :stack="4" />
              <view class="colon"><view class="cdot"></view><view class="cdot"></view></view>
              <z-flap :value="clock[2]" :w="30" :h="46" :fs="50" :hinge="2" :pin="4" :stack="4" />
              <view class="gap"></view>
              <z-flap :value="clock[3]" :w="30" :h="46" :fs="50" :hinge="2" :pin="4" :stack="4" />
            </view>
          </view>
          <view class="bd-when">
            <text class="bd-state" :style="{ color: stateColor }">{{ stateWord }}</text>
            <text class="bd-date">{{ dateLabel }}</text>
            <text class="bd-cd">{{ countdown }}</text>
          </view>
        </view>
        <view class="bd-rule"></view>
        <view class="bd-bottom">
          <view class="bd-cell">
            <text class="bk">报名</text>
            <view class="bd-v-row"><text class="bd-v">{{ signedCount }}</text><text class="bd-v-sub">/{{ m.cap }}</text></view>
            <view class="bd-bar"><view class="bd-bar-fill" :style="{ width: fillPct + '%' }"></view></view>
          </view>
          <view class="bd-vr"></view>
          <view class="bd-cell bd-cell-r">
            <text class="bk">起始盲注</text>
            <text class="bd-v">{{ startBlinds }}</text>
            <text class="bd-s">{{ levelCount }} 级，约 {{ durationText }}</text>
          </view>
        </view>
      </view>

      <!-- 主办方视图：房间码（只有主办方看得到；刚发布进来时亮一下） -->
      <view v-if="isHost && m.roomCode" class="rmc" :class="{ 'rmc-new': justCreated }">
        <view class="rmc-l">
          <view class="rmc-k"><z-icon name="hash" :size="13" color="#FFB547" /><text class="rmc-k-t">房间码 · 仅主办方可见</text></view>
          <text class="rmc-code">{{ roomCodeText }}</text>
        </view>
        <text v-if="justCreated" class="rmc-new-tag">刚刚发布</text>
        <view class="rmc-copy" hover-class="press" @tap="copyRoomCode"><z-icon name="copy" :size="16" color="#FFFFFF" /><text class="rmc-copy-t">复制</text></view>
      </view>
      <view v-if="isHost && proLine" class="rmc-pro"><z-icon name="device-tv" :size="13" color="#9CA3AF" /><text class="rmc-pro-t">{{ proLine }}</text></view>

      <!-- 地点：在开赛时间下方，点「导航」用微信内置地图打开 -->
      <view v-if="m.location" class="loc" hover-class="press-soft" @tap="openMap">
        <view class="loc-ic"><z-icon name="map-pin" :size="18" color="#FF4D4D" /></view>
        <view class="loc-main">
          <text class="loc-name">{{ m.location.name }}</text>
          <text v-if="m.location.address" class="loc-addr">{{ m.location.address }}</text>
        </view>
        <view class="loc-nav"><z-icon name="navigation" :size="14" color="#FFFFFF" /><text class="loc-nav-t">导航</text></view>
      </view>

      <!-- 比赛介绍 -->
      <view class="sec"><text class="st">比赛介绍</text></view>
      <text class="intro">{{ m.intro || '主持人还没有写介绍' }}</text>
      <view v-for="(r, i) in m.rules || []" :key="i" class="rl" :class="r.level === 1 ? 'rl-h1' : 'rl-h2'">
        <view v-if="r.title" class="rl-head"><view v-if="r.level === 1" class="rl-bar"></view><text class="rl-t">{{ r.title }}</text></view>
        <text v-if="r.body" class="rl-b">{{ r.body }}</text>
      </view>

      <!-- 盲注结构：休息、截止买入、前注开启的那一级（以及主办方写了说明的级别）点一下，弹出气泡说明这一级的作用（不另加图标） -->
      <view class="sec"><text class="st">盲注结构</text><text class="sm">{{ m.blindName }}，共 {{ levelCount }} 级</text></view>
      <view class="tt">
        <view class="tr thd"><text class="tc">级别</text><text class="tc">盲注</text><text class="tc">前注</text><text class="tc">时长</text></view>
        <block v-for="r in shownRows" :key="r.key">
          <view class="tr" :class="{ 'tr-last': r.last && popKey !== r.key, 'tr-sp': r.sp, 'tr-on': popKey === r.key }" @tap="tapRow(r)">
            <block v-if="r.t === 'L'">
              <text class="tc">{{ r.no }}</text>
              <text class="tc">{{ r.blinds }}</text>
              <text class="tc" :class="{ 'tc-ante': r.sp && r.sp.kind === 'ante' }">{{ r.ante }}</text>
              <view class="tc tc-dur"><text>{{ r.min }}</text><text class="tc-u">分</text></view>
            </block>
            <block v-else-if="r.t === 'B'">
              <view class="tx tx-b"><z-icon name="coffee" :size="14" color="#FFC53A" /><text class="tx-t">休息</text></view>
              <view class="tc tc-dur"><text>{{ r.min }}</text><text class="tc-u">分</text></view>
            </block>
            <view v-else class="tx tx-c"><z-icon name="scissors" :size="14" color="#FF5646" /><text class="tx-t">截止买入，之后不再接受报名和复活</text></view>
          </view>
          <view v-if="popKey === r.key" class="bp" @tap="popKey = ''">
            <view class="bp-arrow"></view>
            <view class="bp-h"><text class="bp-t">{{ r.sp.title }}</text><text class="bp-src">{{ r.sp.custom ? '主办方说明' : '平台说明' }}</text></view>
            <text class="bp-d">{{ r.sp.text }}</text>
          </view>
        </block>
      </view>
      <view v-if="hiddenRows > 0" class="tt-more" hover-class="press-soft" @tap="expanded = !expanded">
        <text class="tt-more-t">{{ expanded ? '收起' : '展开全部 ' + levelCount + ' 级' }}</text>
        <z-icon :name="expanded ? 'chevron-up' : 'chevron-down'" :size="14" color="#9CA3AF" />
      </view>
      <!-- 记分牌面额图例：只有主办方发布的比赛才有（玩家不能设置记分牌）；默认紧凑显示，可以折叠 -->
      <z-chip-legend v-if="byHost" :chips="chips" />

      <!-- 主持人：只显示已接受邀请的共同主持 -->
      <view class="sec"><text class="st">主持人</text></view>
      <view class="hosts">
        <view v-for="(h, i) in m.hosts" :key="i" class="host">
          <view class="av av-44" :class="{ 'av-owner': h.role === 'owner' }" :style="'background:' + h.bg + ';color:' + h.fg"><text>{{ h.c }}</text></view>
          <text class="host-n">{{ h.name }}</text>
          <text class="host-r" :class="{ 'host-r-owner': h.role === 'owner' }">{{ h.role === 'owner' ? '发起人' : '共同主持' }}</text>
        </view>
      </view>

      <!-- 驻场荷官：倾斜的封面流，中间一张展开，其余折叠成窄条；只作展示和引流 -->
      <block v-if="(m.dealers || []).length">
        <view class="sec"><text class="st">驻场荷官</text><text class="sec-n">{{ m.dealers.length }} 位 · 现场为你发牌</text></view>
        <z-dealer-bar :dealers="m.dealers" />
      </block>

      <!-- 已报名：头像墙带状态（待审核 / 待签到 / 已签到），点开是名单抽屉 -->
      <view class="sec"><text class="st">已报名</text><text class="sm">{{ signedCount }}/{{ m.cap }}</text></view>
      <view class="rw" :hover-class="isHost ? 'press-soft' : ''" @tap="tapWall">
        <view class="rw-grid">
          <view v-for="p in rosterWall" :key="p.key" class="rw-av" :class="isHost ? 'rw-' + p.status : ''" :style="'background:' + p.bg + ';color:' + p.fg">
            <text>{{ p.c }}</text>
            <block v-if="isHost">
              <view v-if="p.status === 'checked'" class="rw-badge rw-badge-ok"><z-icon name="check" :size="8" :stroke="4" color="#FFFFFF" /></view>
              <view v-else-if="p.status === 'pending'" class="rw-badge rw-badge-wait"><z-icon name="hourglass" :size="8" :stroke="3" color="#3A2A00" /></view>
            </block>
          </view>
          <view v-if="rosterMore > 0" class="rw-av rw-more"><text>+{{ rosterMore }}</text></view>
          <text v-if="!roster.length" class="rw-empty">还没有人报名，分享给朋友吧</text>
        </view>
        <view v-if="isHost" class="rw-sum">
          <view v-for="s in rosterSummary" :key="s.key" class="rw-s"><view class="rw-dot" :style="'background:' + s.color"></view><text class="rw-s-t">{{ s.label }} {{ s.n }}</text></view>
          <view class="rw-open"><text class="rw-open-t">名单与签到</text><z-icon name="chevron-right" :size="14" color="#9CA3AF" /></view>
        </view>
        <text v-else class="rw-left">{{ isFull ? '名额已满' : '还剩 ' + (m.cap - signedCount) + ' 个位置' }}</text>
      </view>
      <!-- 我的签到码：已报名的玩家到场后出示给主办方扫码 -->
      <view v-if="myEntry && myEntry.status !== 'pending' && !isHost" class="mk">
        <image class="mk-qr" :src="myQr" mode="aspectFit" />
        <view class="mk-main">
          <text class="mk-t">{{ myEntry.status === 'checked' ? '已签到入座' : '我的签到码' }}</text>
          <text class="mk-code">{{ myCode }}</text>
          <text class="mk-s">{{ myEntry.status === 'checked' ? myEntry.seat : '到场后出示给主办方扫码签到' }}</text>
        </view>
      </view>
      <view v-else-if="myEntry && myEntry.status === 'pending' && !isHost" class="mk mk-wait">
        <z-icon name="hourglass" :size="18" color="#FFC53A" />
        <text class="mk-wait-t">报名待审核，通过后会显示你的签到码</text>
      </view>
    </view>

    <!-- 底部：主办方 → 去分享 + 进入房间（创建比赛后统一在这里分享）；玩家 → 公开且自动通过时立即进入，否则报名加入 -->
    <view v-if="isHost" class="bar">
      <view class="bar-note"><text>{{ justCreated ? '比赛已发布，分享给朋友来报名吧' : '你是这场比赛的主办方' }}</text></view>
      <view class="bar-row">
        <!-- 去分享：点一下冒泡裂开成两个图标——左边转发给好友（链接），右边生成票据图片；点别处收回 -->
        <view class="shr">
          <view v-if="!shareOpen" class="shr-pill" hover-class="press" @tap="shareOpen = true"><z-icon name="share" :size="18" color="#FFFFFF" /><text class="shr-t">去分享</text></view>
          <block v-else>
            <button class="shr-b shr-b-l" open-type="share" hover-class="press" @tap="shareOpen = false"><z-icon name="link" :size="20" color="#FFFFFF" /></button>
            <view class="shr-b shr-b-r" hover-class="press" @tap="openTicket"><z-icon name="photo" :size="20" color="#FFFFFF" /></view>
          </block>
        </view>
        <view class="bar-main" hover-class="press" @tap="enterRoom"><z-icon name="door-enter" :size="19" color="#FFFFFF" /><text class="bar-main-t">进入房间</text></view>
      </view>
    </view>
    <view v-else class="bar">
      <view class="bar-note">
        <block v-if="joinStatus === 'pending'">
          <text>已提交报名，</text><text class="lnk" @tap="withdraw">撤回报名</text>
        </block>
        <text v-else>{{ noteText }}</text>
      </view>
      <view class="bar-row">
        <block v-if="m.isPublic">
          <!-- 去分享：点一下冒泡裂开成两个图标——左边转发给好友（链接），右边生成票据图片；点别处收回 -->
          <view class="shr">
            <view v-if="!shareOpen" class="shr-pill" hover-class="press" @tap="shareOpen = true"><z-icon name="share" :size="18" color="#FFFFFF" /><text class="shr-t">去分享</text></view>
            <block v-else>
              <button class="shr-b shr-b-l" open-type="share" hover-class="press" @tap="shareOpen = false"><z-icon name="link" :size="20" color="#FFFFFF" /></button>
              <view class="shr-b shr-b-r" hover-class="press" @tap="openTicket"><z-icon name="photo" :size="20" color="#FFFFFF" /></view>
            </block>
          </view>
        </block>
        <view class="bar-main" :class="{ 'bar-wait': joinStatus === 'pending' || blocked }" hover-class="press" @tap="onMain">
          <z-icon :name="mainIcon" :size="19" :color="joinStatus === 'pending' || blocked ? '#9CA3AF' : '#FFFFFF'" />
          <text class="bar-main-t" :class="{ 'bar-main-t-wait': joinStatus === 'pending' || blocked }">{{ mainText }}</text>
        </view>
      </view>
    </view>

    <!-- 报名 -->
    <view v-if="joinOpen" class="ov">
      <view class="mask" @tap="joinOpen = false" @touchmove.stop.prevent="noop"></view>
      <view class="sheet-j">
        <view class="grab"></view>
        <text class="sj-title">报名加入</text>
        <view class="sj-sum">
          <image v-if="m.coverImage" class="sj-cover" :src="m.coverImage" mode="aspectFill" />
          <view v-else class="sj-cover" :style="thumbBg"></view>
          <view class="sj-sum-t">
            <text class="sj-name">{{ m.name }}</text>
            <text class="sj-meta">{{ dateLabel }} {{ clockText }}{{ m.location ? '，' + m.location.name : '' }}</text>
          </view>
        </view>
        <view class="sj-lb"><text>给主持人留言（选填）</text><text class="sj-count">{{ message.length }}/60</text></view>
        <textarea v-model="message" class="sj-msg" maxlength="60" placeholder="比如：第一次参加，想和朋友坐一桌" placeholder-class="ph" :adjust-position="true" />
        <text class="sj-note">主持人通过前可以随时撤回</text>
        <!-- 报名和订阅提醒是同一次点击：点下去先弹微信的订阅授权，确认后就提交报名 -->
        <view class="sj-remind">
          <z-icon name="bell-ringing" :size="16" color="#FFC53A" />
          <text class="sj-remind-t">报名后提醒你：审核结果 · 开赛前 15 分钟 · 座位分配</text>
        </view>
        <view class="sj-ok" hover-class="press" @tap="submitJoin">
          <z-icon name="send" :size="18" color="#FFFFFF" />
          <text class="sj-ok-t">提交报名并开启提醒</text>
        </view>
      </view>
    </view>
    <!-- 名单抽屉：按状态筛选；主办方选择待审核的报名后通过，右上角扫码签到 -->
    <view v-if="rosterOpen" class="ov">
      <view class="mask" @tap="closeRoster" @touchmove.stop.prevent="noop"></view>
      <view class="sheet-r">
        <view class="grab"></view>
        <view class="sr-head">
          <view class="sr-head-t"><text class="sr-title">报名名单</text><text class="sr-sub">{{ roster.length }} 人</text></view>
          <!-- 扫码签到：只放一个方形图标 -->
          <view v-if="isHost" class="sr-scan" hover-class="press" @tap="scanCheckin"><z-icon name="scan" :size="22" color="#FFFFFF" /></view>
        </view>
        <!-- 分组；有待审核的报名时，右边是「选择」 -->
        <view v-if="!selecting" class="sr-tabs">
          <view v-for="t in rosterTabs" :key="t.key" class="sr-tab" :class="{ 'sr-tab-on': rosterTab === t.key }" hover-class="press" @tap="rosterTab = t.key"><text>{{ t.label }} {{ t.n }}</text></view>
          <view v-if="isHost && pendingCount" class="sr-sel" hover-class="press" @tap="startSelect"><text class="sr-sel-t">选择</text></view>
        </view>
        <!-- 选择待审核的报名：全选、通过、取消 -->
        <view v-else class="sr-selbar">
          <view class="sr-all" hover-class="press" @tap="toggleAll">
            <view class="sr-ck" :class="{ 'sr-ck-on': allPicked }"><z-icon v-if="allPicked" name="check" :size="11" :stroke="3.4" color="#FFFFFF" /></view>
            <text class="sr-all-t">全选</text>
          </view>
          <text class="sr-picked">已选 {{ picked.length }} 人</text>
          <view class="sr-cancel" hover-class="press" @tap="cancelSelect"><text>取消</text></view>
          <view class="sr-ok" :class="{ 'sr-ok-dis': !picked.length }" hover-class="press" @tap="approvePicked"><text class="sr-ok-t">通过{{ picked.length ? '（' + picked.length + '）' : '' }}</text></view>
        </view>
        <scroll-view scroll-y class="sr-list">
          <view v-for="p in rosterShown" :key="p.key" class="sr-row" @tap="tapRosterRow(p)">
            <view v-if="selecting" class="sr-ck sr-ck-row" :class="{ 'sr-ck-on': picked.includes(p.key) }"><z-icon v-if="picked.includes(p.key)" name="check" :size="11" :stroke="3.4" color="#FFFFFF" /></view>
            <view class="sr-av" :style="'background:' + p.bg + ';color:' + p.fg"><text>{{ p.c }}</text></view>
            <view class="sr-main">
              <view class="sr-top"><text class="sr-n">{{ p.name }}</text><text v-if="p.mine" class="sr-me">我</text></view>
              <text class="sr-s">{{ p.status === 'checked' ? '已签到 · ' + p.seat : p.status === 'pending' ? (p.message ? '留言：' + p.message : '等待审核') : '已报名，待签到' }}</text>
            </view>
            <view v-if="isHost && p.status === 'signed' && !selecting" class="sr-btn sr-btn-2" hover-class="press" @tap.stop="manualCheckin(p)"><text class="sr-btn-t">核销</text></view>
            <view v-else-if="!selecting" class="sr-pill" :style="'color:' + ROSTER_STATUS[p.status].color + ';background:' + ROSTER_STATUS[p.status].color + '1F'"><text>{{ ROSTER_STATUS[p.status].label }}</text></view>
          </view>
          <text v-if="!rosterShown.length" class="sr-empty">这里还没有人</text>
        </scroll-view>
      </view>
    </view>

    <!-- 去分享展开时，点别处收回 -->
    <view v-if="shareOpen" class="shr-catch" @tap="shareOpen = false" @touchmove.stop.prevent="noop"></view>
    <!-- 票据预览（参照 Royal Flush 票据模板） -->
    <view v-if="ticketOpen" class="ov ov-c">
      <view class="mask" @tap="ticketOpen = false" @touchmove.stop.prevent="noop"></view>
      <view class="pst">
        <image v-if="ticketSrc" class="pst-img" :src="ticketSrc" mode="aspectFit" />
        <view v-else class="pst-img pst-loading"><text>正在生成票据…</text></view>
        <view class="pst-acts">
          <view class="pst-btn pst-btn-2" hover-class="press" @tap="ticketOpen = false"><text class="pst-btn-t">关闭</text></view>
          <view class="pst-btn" :class="{ 'pst-btn-dis': !ticketSrc }" hover-class="press" @tap="saveTicket"><z-icon name="download" :size="16" color="#FFFFFF" /><text class="pst-btn-t">保存到相册</text></view>
        </view>
      </view>
    </view>
    <!-- 画转发卡片和海报用的 canvas，放在屏幕外 -->
    <!-- #ifdef MP-WEIXIN -->
    <canvas id="share-cv" type="2d" class="cv-off"></canvas>
    <!-- #endif -->
    <SciFiScannerModal />
    <z-subscribe :show="subOpen" @close="onSubClose" @done="onSubDone" />
    <z-pop :show="pop.show" :text="pop.text" :icon="pop.icon" :tone="pop.tone" />
  </view>
</template>

<script setup>
import { requireLogin, getAuth } from '@/common/auth.js'
import { ref, reactive, computed, getCurrentInstance } from 'vue'
import { onLoad, onReady, onPageScroll, onShareAppMessage } from '@dcloudio/uni-app'
import ZIcon from '@/components/z-icon/z-icon.vue'
import ZFlap from '@/components/z-flap/z-flap.vue'
import ZPop from '@/components/z-pop/z-pop.vue'
import ZHeat from '@/components/z-heat/z-heat.vue'
import ZSubscribe from '@/components/z-subscribe/z-subscribe.vue'
import ZDealerBar from '@/components/z-dealer-bar/z-dealer-bar.vue'
import ZChipLegend from '@/components/z-chip-legend/z-chip-legend.vue'
import SciFiScannerModal from '@/components/SciFiScannerModal/SciFiScannerModal.vue'
import { openScanner } from '@/common/scanner.js'
import { addView } from '@/common/heat.js'
import { rosterOf, approve, checkIn, codeOf, checkinPayload, parseCheckin, ROSTER_STATUS } from '@/common/roster.js'
import { specialOf } from '@/common/blind-notes.js'
import { chipsOf } from '@/common/chips.js'
import { qrSvgUri } from '@/common/qr.js'
import { drawCard, drawTicket, ticketLayout, TICKET_W } from '@/common/share-canvas.js'
import { SCENE_TINT } from '@/common/cover-art.js'
import { shareLinkOf, SUBSCRIBE_TMPLS } from '@/common/config.js'
import { getNavMetrics } from '@/common/nav.js'
import { svgUri, coverStyle } from '@/common/svg.js'
import { getMatch, getJoin, setJoin } from '@/common/store.js'
import { me, coverScenes, makeDemoMatch } from '@/mock/data.js'
import { findPublicMatch } from '@/mock/plaza.js'
import { TV_THEMES } from '@/mock/remote.js'
import { tagOf, tagStatus, publicTags } from '@/common/tags.js'
import { fitsDisplay } from '@/common/font-coverage.js'

const nav = getNavMetrics()
const topbarStyle = `height:${nav.statusBar + nav.navH}px;padding:${nav.statusBar}px ${nav.capsuleW}px 0`
const navBtnStyle = `top:${nav.statusBar + Math.max(0, (nav.navH - 36) / 2)}px`

const p2 = (n) => (n < 10 ? '0' : '') + n
const toast = (title) => uni.showToast({ title, icon: 'none' })
const noop = () => {}
const WEEK = '日一二三四五六'

const m = ref(makeDemoMatch())
const canBack = ref(false)
const scrolled = ref(false)
const expanded = ref(false)
const joinOpen = ref(false)
const joinStatus = ref('')
const message = ref('')
const now = ref(Date.now())
const clock = ref(['0', '0', '0', '0'])

onLoad((q) => {
  if (!requireLogin()) return // 必须登录：未登录转到登录页，登录后回到这里
  const query = { ...(q || {}) }
  // 微信扫票据上的二维码进来（扫普通链接二维码打开小程序）：完整链接在 q 里，从中取出比赛 id
  if (!query.id && query.q) {
    const link = decodeURIComponent(query.q)
    const hit = link.match(/[?&]id=([^&#]+)/)
    if (hit) query.id = decodeURIComponent(hit[1])
  }
  const found = query.id ? getMatch(query.id) || findPublicMatch(query.id) : null
  if (found) m.value = { participants: [], hosts: [], ...found }
  views.value = addView(m.value)
  // 从创建比赛页发布后进来：房间码卡片亮一下
  if (query.created === '1') {
    justCreated.value = true
    setTimeout(() => { justCreated.value = false }, 6000)
  }
  // 开发者工具里可以用编译参数 pub=0 / auto=0 预览另外两种状态
  if (query.pub === '0') m.value.isPublic = false
  if (query.auto === '0') m.value.autoApprove = false
  canBack.value = getCurrentPages().length > 1
  const j = getJoin(m.value.id)
  joinStatus.value = j ? j.status : ''
  // 进页面时开赛时间从 00:00 翻到实际时间
  setTimeout(() => { clock.value = clockText.value.replace(':', '').split('') }, 400)
})
onPageScroll(({ scrollTop }) => {
  const on = scrollTop > 150
  if (on !== scrolled.value) scrolled.value = on
})
// 转发卡片：标题、卡片图都来自真实的比赛数据；卡片图进页面时先画好，转发时再按最新的报名人数重画（3 秒内画好就用新的）
onShareAppMessage(() => {
  const base = { title: shareTitle.value, path: '/pages/invite/index?id=' + m.value.id }
  return { ...base, ...(cardPath ? { imageUrl: cardPath } : {}), promise: renderImage('card').then((p) => { cardPath = p; return { ...base, imageUrl: p } }).catch(() => base) }
})

// 比赛名称是用户输入的，子集里缺字时整行改用系统粗体
const displayOk = computed(() => fitsDisplay(m.value.name))

/* ---------- 封面 ---------- */
const scene = computed(() => coverScenes.find((c) => c.key === m.value.cover) || coverScenes[0])
const heroBg = computed(() => coverStyle(scene.value.key, 'wide'))
const thumbBg = computed(() => coverStyle(scene.value.key, 'share'))

/* ---------- 时间 ---------- */
const start = computed(() => new Date(m.value.startAt))
const clockText = computed(() => `${p2(start.value.getHours())}:${p2(start.value.getMinutes())}`)
const dateLabel = computed(() => `${p2(start.value.getMonth() + 1)}/${p2(start.value.getDate())} 周${WEEK[start.value.getDay()]}`)
const started = computed(() => m.value.startAt <= now.value)
const countdown = computed(() => {
  const diff = m.value.startAt - now.value
  if (diff <= 0) return '已开赛'
  const d = Math.floor(diff / 86400000)
  if (d >= 1) return `还有 ${d} 天`
  const h = Math.floor(diff / 3600000)
  if (h >= 1) return `还有 ${h} 小时`
  return `还有 ${Math.max(1, Math.floor(diff / 60000))} 分钟`
})

/* ---------- 人数 ---------- */
const signedCount = computed(() => (m.value.participants || []).length)
const isFull = computed(() => signedCount.value >= m.value.cap)
const fillPct = computed(() => Math.min(100, Math.round((signedCount.value / m.value.cap) * 1000) / 10))
const shownPeople = computed(() => (m.value.participants || []).slice(0, 6))
const morePeople = computed(() => Math.max(0, signedCount.value - 6))
const stateWord = computed(() => (isFull.value ? '已满员' : started.value ? '进行中' : '报名中'))
const stateColor = computed(() => (isFull.value || started.value ? '#FFC53A' : '#3FCF84'))

/* ---------- 盲注 ---------- */
const fmtNum = (n) => (n >= 10000 ? n / 10000 + '万' : String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ','))
const levels = computed(() => m.value.blindRows.filter((r) => r.t === 'L'))
const levelCount = computed(() => levels.value.length)
const startBlinds = computed(() => (levels.value[0] ? `${fmtNum(levels.value[0].sb)}/${fmtNum(levels.value[0].bb)}` : '—'))
const durationText = computed(() => {
  const min = m.value.blindRows.reduce((sum, r) => sum + (r.min || 0), 0)
  const h = Math.round((min / 60) * 2) / 2
  return h >= 1 ? `${h} 小时` : `${min} 分钟`
})
const allRows = computed(() => {
  let n = 0
  return m.value.blindRows.map((r, i) => (r.t === 'L'
    ? { key: i, t: 'L', no: p2(++n), blinds: `${fmtNum(r.sb)}/${fmtNum(r.bb)}`, ante: r.ante ? fmtNum(r.ante) : '—', min: r.min, sp: specialOf(m.value.blindRows, i) }
    : { key: i, t: r.t, min: r.min || 0, sp: specialOf(m.value.blindRows, i) }))
})
// 收起时只显示到第 6 级
const cutIndex = computed(() => {
  let n = 0
  const idx = allRows.value.findIndex((r) => r.t === 'L' && ++n === 6)
  return idx < 0 ? allRows.value.length : idx + 1
})
const hiddenRows = computed(() => allRows.value.length - cutIndex.value)
const shownRows = computed(() => {
  const list = expanded.value ? allRows.value : allRows.value.slice(0, cutIndex.value)
  return list.map((r, i) => ({ ...r, last: i === list.length - 1 }))
})

/* ---------- 主办方视图：自己发布的比赛（以后玩家和主办方在这一页看到不同的内容） ---------- */
const uid = (getAuth() || {}).userId || me.id
const isHost = computed(() => !!m.value && (m.value.ownerId === uid || m.value.mine === true))
const justCreated = ref(false)
const roomCodeText = computed(() => {
  const c = (m.value && m.value.roomCode) || ''
  return c ? c.slice(0, 3) + ' ' + c.slice(3) : ''
})
function copyRoomCode() {
  uni.setClipboardData({ data: m.value.roomCode, success: () => toast('房间码已复制') })
}
const enterRoom = () => uni.navigateTo({ url: '/pages/room/index?id=' + m.value.id })
// 主办方创建的比赛：邀请人头像带 V 标识
const byHost = computed(() => !!m.value && m.value.creatorRole === 'host')
// 标签：公开显示审核通过的；主办方视图里也能看到审核中的（标「审核中」）
const shownTags = computed(() => ((m.value && m.value.tags) || []).map(tagOf)
  .map((t) => ({ text: t.text, status: tagStatus(t) }))
  .filter((t) => t.status === 'approved' || (isHost.value && t.status === 'pending'))
  .map((t) => ({ text: t.text, pending: t.status === 'pending' })))
// 主办方视图：现场配置一行（现场大屏、TV 主题）
const proLine = computed(() => {
  const x = m.value || {}
  const parts = []
  if ((x.screens || []).length) parts.push(`现场大屏 ${x.screens.length} 台`)
  if (x.tvTheme) {
    const t = TV_THEMES.find((k) => k.key === x.tvTheme.key)
    parts.push(`TV 主题「${t ? t.name : x.tvTheme.key}」`)
  }
  return parts.join(' · ')
})

/* ---------- 提示条 ---------- */
const pop = reactive({ show: false, text: '', icon: 'check', tone: 'red' })
let popTimer = null
function popMsg(text, icon = 'check', tone = 'red') {
  clearTimeout(popTimer)
  Object.assign(pop, { show: true, text, icon, tone })
  popTimer = setTimeout(() => { pop.show = false }, 2600)
}
const buzz = () => { try { uni.vibrateShort({ type: 'light' }) } catch (e) {} }
const instance = getCurrentInstance()

/* ---------- 动态热度：实时报名人数 + 浏览量 ---------- */
const views = ref(0)

/* ---------- 盲注结构：特殊级别点开弹出说明；记分牌面额 ---------- */
const popKey = ref('')
function tapRow(r) {
  if (!r.sp) return
  popKey.value = popKey.value === r.key ? '' : r.key
}
const chips = computed(() => chipsOf(m.value))

/* ---------- 报名名单与现场签到 ---------- */
const rosterVer = ref(0) // 审批、签到之后加一，名单重新读取
const roster = computed(() => (rosterVer.value, joinStatus.value, rosterOf(m.value, me)))
// 报名队列的状态只有主办方在自己的比赛里看得到；别人只看到已报名的玩家（不含待审核的）
const wallList = computed(() => (isHost.value ? roster.value : roster.value.filter((p) => p.status !== 'pending')))
const rosterWall = computed(() => wallList.value.slice(0, 14))
const rosterMore = computed(() => Math.max(0, wallList.value.length - 14))
const tapWall = () => { if (isHost.value) openRoster() }
const countOf = (k) => roster.value.filter((p) => p.status === k).length
const pendingCount = computed(() => countOf('pending'))
const rosterSummary = computed(() => ['pending', 'signed', 'checked'].map((k) => ({ key: k, label: ROSTER_STATUS[k].label, color: ROSTER_STATUS[k].color, n: countOf(k) })).filter((s) => s.n))
const rosterOpen = ref(false)
const rosterTab = ref('all')
const rosterTabs = computed(() => [{ key: 'all', label: '全部', n: roster.value.length }].concat(['pending', 'signed', 'checked'].map((k) => ({ key: k, label: ROSTER_STATUS[k].label, n: countOf(k) }))))
const rosterShown = computed(() => (rosterTab.value === 'all' ? roster.value : roster.value.filter((p) => p.status === rosterTab.value)))
const myEntry = computed(() => roster.value.find((p) => p.mine) || null)
const myCode = computed(() => codeOf(m.value.id, 'me'))
const myQr = computed(() => qrSvgUri(checkinPayload(m.value.id, 'me')))
function openRoster() {
  rosterTab.value = isHost.value && pendingCount.value ? 'pending' : 'all'
  rosterOpen.value = true
}
function afterApprove(keys) {
  // 演示：主办方和玩家在同一台手机上时，「我」的报名也跟着通过
  if (keys.includes('me')) {
    setJoin(m.value.id, { ...(getJoin(m.value.id) || {}), status: 'signed' })
    joinStatus.value = 'signed'
  }
  rosterVer.value += 1
}
// 选择 → 全选 → 通过：只能选待审核的报名
const selecting = ref(false)
const picked = ref([])
const pendingKeys = computed(() => roster.value.filter((p) => p.status === 'pending').map((p) => p.key))
const allPicked = computed(() => pendingKeys.value.length > 0 && pendingKeys.value.every((k) => picked.value.includes(k)))
function startSelect() {
  selecting.value = true
  picked.value = []
  rosterTab.value = 'pending'
}
function cancelSelect() {
  selecting.value = false
  picked.value = []
}
function toggleAll() {
  picked.value = allPicked.value ? [] : pendingKeys.value.slice()
}
function tapRosterRow(p) {
  if (!selecting.value || p.status !== 'pending') return
  const i = picked.value.indexOf(p.key)
  if (i >= 0) picked.value.splice(i, 1)
  else picked.value.push(p.key)
}
function approvePicked() {
  if (!picked.value.length) return toast('先选择要通过的报名')
  const keys = picked.value.slice()
  approve(m.value.id, keys)
  afterApprove(keys)
  popMsg(`已通过 ${keys.length} 条报名，会通知他们`)
  cancelSelect()
  if (!pendingCount.value) rosterTab.value = 'signed'
}
function closeRoster() {
  rosterOpen.value = false
  cancelSelect()
}
function doCheckin(p) {
  const seat = checkIn(m.value.id, p.key, roster.value)
  rosterVer.value += 1
  buzz()
  popMsg(`「${p.name}」已签到，${seat}`, 'armchair')
}
function manualCheckin(p) {
  uni.showModal({
    title: `给「${p.name}」签到？`,
    content: '玩家没带签到码时可以手动核销，会按顺序分配座位。',
    confirmText: '签到',
    confirmColor: '#DC0000',
    success: ({ confirm }) => { if (confirm) doCheckin(p) }
  })
}
// 扫码核销：扫玩家的签到码（TJCK:比赛:玩家:四位码），校验通过后签到并分配座位
async function scanCheckin() {
  const sample = roster.value.find((p) => p.status === 'signed')
  const res = await openScanner({
    title: '扫码核销',
    hint: '对准玩家出示的签到码',
    validate: (t) => {
      const r = parseCheckin(t, m.value.id)
      if (r.error) return r.error
      const p = roster.value.find((x) => x.key === r.key)
      if (!p) return '名单里没有这位玩家'
      if (p.status === 'checked') return `「${p.name}」已经签到过了（${p.seat}）`
      if (p.status === 'pending') return `「${p.name}」的报名还没通过`
      return true
    },
    demo: sample ? checkinPayload(m.value.id, sample.key) : 'TJCK:none'
  })
  if (!res || res.manual) return
  const r = parseCheckin(res.result, m.value.id)
  const p = roster.value.find((x) => x.key === r.key)
  if (p) doCheckin(p)
}

/* ---------- 报名成功：订阅消息授权（开赛提醒、审核通过、座位分配） ---------- */
const subOpen = ref(false)
let afterSub = null
function askSubscribe(next) {
  afterSub = next || null
  subOpen.value = true
}
function runAfterSub(delay) {
  const f = afterSub
  afterSub = null
  if (f) setTimeout(f, delay)
}
function onSubClose() {
  subOpen.value = false
  runAfterSub(0)
}
function onSubDone(res) {
  subOpen.value = false
  toast(res.demo || res.accepted.length ? '已开启比赛提醒' : '没有开启提醒')
  runAfterSub(700)
}

/* ---------- 分享：转发卡片（5:4）和票据 ---------- */
const shareTitle = computed(() => `${m.value.name}｜${dateLabel.value} ${clockText.value} 开赛，${isFull.value ? '名额已满' : '还剩 ' + (m.value.cap - signedCount.value) + ' 个位置'}`)
// 转发卡片：消息里已经有标题，卡片上不写标题——赛事封面、主办方头像、标签、开赛时间、荷官 / 选手头像气泡
const cardData = computed(() => {
  const x = m.value
  const d = new Date(x.startAt)
  const host = x.creator || {}
  const dealers = (x.dealers || []).map((dl) => ({ char: dl.char, bg: dl.tone || dl.bg || '#2A2D36', fg: '#FFFFFF', photo: dl.photo || '', dealer: true }))
  const players = roster.value.filter((p) => p.status !== 'pending').map((p) => ({ char: p.c, bg: p.bg, fg: p.fg }))
  return {
    coverSrc: x.coverImage || `/static/covers/${scene.value.key}.jpg`,
    tint: SCENE_TINT[scene.value.key] || '#1F222A',
    host: host.name || x.inviter.name,
    hostChar: host.char || x.inviter.c,
    hostBg: x.inviter.bg,
    hostFg: x.inviter.fg,
    byHost: byHost.value,
    tags: publicTags(x.tags),
    date: `${d.getMonth() + 1}/${d.getDate()} 周${WEEK[d.getDay()]}`,
    time: clockText.value,
    people: dealers.concat(players),
    dealerCount: dealers.length,
    playerCount: signedCount.value
  }
})
// 票据：比赛邀请。主标题是赛事标题，副标题是主办方；日期、开赛、起始盲注一行，地点和完整地址一行；
// 不放封面主题和报名状态；票号按比赛固定（不带玩家的签到码）；二维码是比赛邀请页的链接
const ticketData = computed(() => {
  const x = m.value
  const d = new Date(x.startAt)
  const host = x.creator || {}
  const no = String(1000 + (String(x.id).split('').reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7) % 9000))
  return {
    title: x.name,
    host: host.name || x.inviter.name,
    byHost: byHost.value,
    dateMain: `${p2(d.getMonth() + 1)}.${p2(d.getDate())}`,
    weekday: '周' + WEEK[d.getDay()],
    time: clockText.value,
    venue: x.location ? x.location.name : '地点待定',
    address: x.location ? x.location.address || '' : '',
    blinds: startBlinds.value,
    levels: levelCount.value,
    ticketNo: 'NO.' + no,
    qr: shareLinkOf(x.id),
    seed: Number(no)
  }
})
// 画图用的 canvas：小程序用页面里的 canvas（type="2d"），H5 新建一个
async function getCanvas(W, H) {
  // #ifdef MP-WEIXIN
  const node = await new Promise((resolve) => uni.createSelectorQuery().in(instance.proxy).select('#share-cv').fields({ node: true, size: true }).exec((r) => resolve(r && r[0] && r[0].node)))
  if (!node) throw new Error('no canvas')
  node.width = W
  node.height = H
  return node
  // #endif
  // #ifndef MP-WEIXIN
  const c = document.createElement('canvas')
  c.width = W
  c.height = H
  return c
  // #endif
}
function loadImg(canvas, src) {
  return new Promise((resolve) => {
    if (!src) return resolve(null)
    let img = null
    // #ifdef MP-WEIXIN
    img = canvas.createImage()
    // #endif
    // #ifndef MP-WEIXIN
    img = new Image()
    // #endif
    img.onload = () => resolve(img)
    img.onerror = () => resolve(null)
    img.src = src
  })
}
// 票据导出 PNG（票面以外和缺口透明）；转发卡片铺满整张图，用 JPG
function exportCanvas(canvas, type) {
  // #ifdef MP-WEIXIN
  return new Promise((resolve, reject) => uni.canvasToTempFilePath({ canvas, fileType: type, quality: 0.92, success: (r) => resolve(r.tempFilePath), fail: reject }))
  // #endif
  // #ifndef MP-WEIXIN
  return Promise.resolve(type === 'png' ? canvas.toDataURL('image/png') : canvas.toDataURL('image/jpeg', 0.92))
  // #endif
}
async function renderImage(kind) {
  if (kind === 'ticket') {
    // 先量版面（地址有几行），再按内容的高度画
    const probe = await getCanvas(TICKET_W, 100)
    const L = ticketLayout(probe.getContext('2d'), ticketData.value)
    const c = await getCanvas(TICKET_W, L.H)
    drawTicket(c.getContext('2d'), ticketData.value, L)
    return exportCanvas(c, 'png')
  }
  const c = await getCanvas(1000, 800)
  const d = cardData.value
  const imgs = await Promise.all([loadImg(c, d.coverSrc)].concat(d.people.slice(0, 5).map((pp) => loadImg(c, pp.photo))))
  drawCard(c.getContext('2d'), d, { cover: imgs[0], dealers: imgs.slice(1) }, 2)
  return exportCanvas(c, 'jpg')
}
let cardPath = ''
onReady(() => { renderImage('card').then((p) => { cardPath = p }).catch(() => {}) })
// 去分享：展开成两个图标；右边生成票据（以后由服务端生成）
const shareOpen = ref(false)
const ticketOpen = ref(false)
const ticketSrc = ref('')
async function openTicket() {
  shareOpen.value = false
  ticketOpen.value = true
  ticketSrc.value = ''
  try {
    ticketSrc.value = await renderImage('ticket')
  } catch (e) {
    ticketOpen.value = false
    toast('票据生成失败，请重试')
  }
}
function saveTicket() {
  if (!ticketSrc.value) return
  // #ifdef MP-WEIXIN
  uni.saveImageToPhotosAlbum({
    filePath: ticketSrc.value,
    success: () => popMsg('票据已保存到相册', 'download'),
    fail: (e) => {
      if (!/auth|deny/i.test((e && e.errMsg) || '')) return
      uni.showModal({ title: '需要相册权限', content: '在设置里允许保存到相册后再试一次。', confirmText: '去设置', success: ({ confirm }) => { if (confirm) uni.openSetting() } })
    }
  })
  // #endif
  // #ifndef MP-WEIXIN
  const a = document.createElement('a')
  a.href = ticketSrc.value
  a.download = `${m.value.name}-票据.png`
  a.click()
  popMsg('票据已下载', 'download')
  // #endif
}

/* ---------- 底部按钮 ---------- */
const direct = computed(() => m.value.isPublic && m.value.autoApprove)
const blocked = computed(() => isFull.value && joinStatus.value !== 'pending')
const mainText = computed(() => {
  if (joinStatus.value === 'pending') return '等待主持人通过'
  if (joinStatus.value === 'signed') return '进入房间'
  if (isFull.value) return '已满员'
  return direct.value ? '立即进入' : '报名加入'
})
const mainIcon = computed(() => (joinStatus.value === 'pending' ? 'hourglass' : direct.value ? 'door-enter' : 'user-plus'))
const noteText = computed(() => {
  if (isFull.value) return '名额已满，主持人放开名额后会重新开放'
  if (direct.value) return '直接进入房间，不需要审核'
  return m.value.isPublic ? '提交报名后，由主持人审核' : '这是一场非公开比赛，报名后需要主持人同意'
})

function onMain() {
  if (joinStatus.value === 'pending') return toast('主持人还没处理你的报名')
  if (isFull.value) return toast('名额已满')
  const enter = () => uni.navigateTo({ url: '/pages/room/index?id=' + m.value.id })
  if (joinStatus.value === 'signed') return enter()
  if (direct.value) {
    // 立即进入：先记为已报名，问一次要不要开启比赛提醒，再进房间
    setJoin(m.value.id, { status: 'signed', at: Date.now() })
    joinStatus.value = 'signed'
    return askSubscribe(enter)
  }
  message.value = ''
  joinOpen.value = true
}
// 需要审核的比赛：点「提交报名并开启提醒」时，在同一次点击里申请订阅消息（微信要求由点击触发），
// 用户在微信的授权弹窗里确认后就提交报名——只确认一次、只点一次
function submitJoin() {
  const done = () => {
    setJoin(m.value.id, { status: 'pending', message: message.value.trim(), at: Date.now() })
    joinStatus.value = 'pending'
    joinOpen.value = false
    toast('已提交报名')
  }
  const ids = Object.values(SUBSCRIBE_TMPLS).filter(Boolean)
  if (ids.length && typeof uni.requestSubscribeMessage === 'function') uni.requestSubscribeMessage({ tmplIds: ids, complete: done })
  else done()
}
function withdraw() {
  setJoin(m.value.id, null)
  joinStatus.value = ''
  toast('已撤回报名')
}
function openMap() {
  const l = m.value.location
  if (!l) return
  // #ifdef MP
  // openLocation 不需要位置授权，也不在 requiredPrivateInfos 的声明范围内
  uni.openLocation({ latitude: l.latitude, longitude: l.longitude, name: l.name, address: l.address, scale: 16, fail: () => toast('没能打开地图') })
  // #endif
  // #ifndef MP
  uni.setClipboardData({ data: `${l.name} ${l.address}`, success: () => toast('地址已复制') })
  // #endif
}
function leave() {
  if (canBack.value) uni.navigateBack()
  else uni.reLaunch({ url: '/pages/home/index' })
}
</script>

<style>
.page { min-height: 100vh; background: #181A20; padding-bottom: calc(260rpx + env(safe-area-inset-bottom)); }
.press { opacity: .82; transform: scale(.97); }
.press-soft { opacity: .85; }
.ph { color: #6B7280; }
.font-sys { font-family: "PingFang SC", "Microsoft YaHei", sans-serif !important; font-weight: 600; letter-spacing: 0; }

/* 封面 */
.hero { position: relative; height: 464rpx; overflow: hidden; background: #1F222A; }
.hero-fill { position: absolute; left: 0; top: 0; width: 100%; height: 100%; }
.hero-art { background-size: cover; background-position: center; }
.tag {
  position: absolute; left: 32rpx; bottom: 84rpx; display: flex; align-items: center; padding: 12rpx 24rpx;
  border-radius: 999rpx; background: rgba(10, 10, 12, .55);
}
.tag-n { font-size: 24rpx; font-weight: 500; color: #FFFFFF; }
.tag-l { margin-left: 16rpx; font-size: 24rpx; color: #E5E7EB; }

/* 顶部 */
.topbar {
  position: fixed; z-index: 20; left: 0; top: 0; right: 0; box-sizing: border-box; display: flex; align-items: center; justify-content: center;
  background: #181A20; border-bottom: 1px solid #24272F; opacity: 0; transition: opacity .2s ease; pointer-events: none;
}
.topbar-on { opacity: 1; }
.topbar-t { font-family: "ZZDisplay", "PingFang SC", sans-serif; font-size: 34rpx; color: #FFFFFF; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.nav-btn {
  position: fixed; z-index: 21; left: 32rpx; width: 72rpx; height: 72rpx; box-sizing: border-box; border-radius: 50%;
  background: rgba(14, 15, 19, .6); border: 1rpx solid rgba(255, 255, 255, .14); display: flex; align-items: center; justify-content: center;
}

/* 内容面板 */
.sheet { position: relative; z-index: 1; margin-top: -56rpx; padding: 36rpx 32rpx 0; background: #181A20; border-radius: 56rpx 56rpx 0 0; }
.inviter { display: flex; align-items: center; }
.av { position: relative; display: flex; align-items: center; justify-content: center; flex: none; box-sizing: border-box; border-radius: 50%; font-weight: 500; }
.av-28 { width: 56rpx; height: 56rpx; font-size: 24rpx; }
.av-44 { width: 88rpx; height: 88rpx; font-size: 32rpx; }
.av-30 { width: 60rpx; height: 60rpx; font-size: 24rpx; border: 4rpx solid #181A20; }
.av-on { margin-left: -16rpx; }
.av-owner { box-shadow: 0 0 0 4rpx #181A20, 0 0 0 8rpx #F4B740; }
.av-more { background: #35383F; color: #E5E7EB; font-size: 22rpx; }
.inviter-t { margin-left: 16rpx; font-size: 26rpx; color: #9CA3AF; }
.inviter-n { font-weight: 500; color: #E5E7EB; }
.srv { margin-left: auto; height: 48rpx; padding: 0 18rpx; border-radius: 999rpx; background: #3A1C1F; display: flex; align-items: center; }
.srv-t { margin-left: 8rpx; font-size: 22rpx; color: #F2A7A7; }
.title { display: block; margin-top: 24rpx; font-family: "ZZDisplay", "BoardHei", "PingFang SC", sans-serif; font-size: 54rpx; line-height: 1.2; letter-spacing: 2rpx; color: #FFFFFF; }
.chips { margin-top: 20rpx; display: flex; flex-wrap: wrap; }
.chip { height: 52rpx; margin: 0 12rpx 12rpx 0; padding: 0 20rpx; border-radius: 999rpx; background: #262A34; display: flex; align-items: center; font-size: 24rpx; color: #E5E7EB; }
.chip-t { margin-left: 8rpx; font-size: 24rpx; color: #E5E7EB; }

/* 关键信息板 */
.board { margin-top: 20rpx; padding: 28rpx; border-radius: 28rpx; background: #050505; }
.bd-top { display: flex; align-items: flex-end; justify-content: space-between; }
.bk { display: block; font-family: "BoardHei", "PingFang SC", sans-serif; font-weight: 900; font-size: 24rpx; color: #8F8F8A; }
.bd-flaps { display: flex; align-items: center; margin-top: 16rpx; padding-bottom: 8rpx; }
.gap { width: 8rpx; }
.colon { display: flex; flex-direction: column; justify-content: space-between; height: 28rpx; margin: 0 10rpx; }
.cdot { width: 10rpx; height: 10rpx; background: #F2F2EE; }
.bd-when { display: flex; flex-direction: column; align-items: flex-end; }
.bd-state { font-family: "BoardHei", "PingFang SC", sans-serif; font-weight: 900; font-size: 32rpx; letter-spacing: 2rpx; }
.bd-date { margin-top: 16rpx; font-size: 28rpx; font-weight: 500; color: #F2F2EE; }
.bd-cd { margin-top: 8rpx; font-size: 24rpx; color: #8F8F8A; }
.bd-rule { height: 4rpx; margin: 28rpx -28rpx; background: #262626; }
.bd-bottom { display: flex; }
.bd-cell { flex: 1; padding-right: 28rpx; }
.bd-cell-r { padding: 0 0 0 28rpx; }
.bd-vr { width: 4rpx; margin: -28rpx 0; background: #262626; }
.bd-v-row { display: flex; align-items: baseline; margin-top: 16rpx; }
.bd-v { display: block; margin-top: 16rpx; font-family: "BoardNum", "DIN Alternate", sans-serif; font-weight: 800; font-size: 56rpx; line-height: 1; color: #F2F2EE; }
.bd-v-row .bd-v { margin-top: 0; }
.bd-v-sub { font-family: "BoardNum", sans-serif; font-weight: 700; font-size: 38rpx; color: #8F8F8A; }
.bd-bar { margin-top: 16rpx; height: 8rpx; border-radius: 4rpx; background: #1A1A1A; overflow: hidden; }
.bd-bar-fill { height: 8rpx; background: #F2F2EE; }
.bd-s { display: block; margin-top: 12rpx; font-size: 24rpx; color: #8F8F8A; }

/* 地点 */
.loc { margin-top: 16rpx; border-radius: 28rpx; background: #1F222A; padding: 22rpx 20rpx 22rpx 22rpx; display: flex; align-items: center; }
.loc-ic { width: 64rpx; height: 64rpx; flex: none; border-radius: 50%; background: #262A34; display: flex; align-items: center; justify-content: center; }
.loc-main { flex: 1; min-width: 0; margin: 0 16rpx 0 20rpx; display: flex; flex-direction: column; }
.loc-name { font-size: 28rpx; font-weight: 500; color: #FFFFFF; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.loc-ph { font-weight: 400; color: #6B7280; }
.loc-addr { margin-top: 6rpx; font-size: 24rpx; color: #9CA3AF; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.loc-nav { flex: none; height: 60rpx; padding: 0 20rpx; border-radius: 999rpx; background: #35383F; display: flex; align-items: center; }
.loc-nav-t { margin-left: 6rpx; font-size: 24rpx; font-weight: 500; color: #FFFFFF; }

/* 区块 */
.sec { margin-top: 48rpx; display: flex; align-items: baseline; justify-content: space-between; }
.st { font-size: 30rpx; font-weight: 500; color: #FFFFFF; }
.sm { font-size: 24rpx; color: #9CA3AF; }
.intro { display: block; margin-top: 20rpx; font-size: 28rpx; line-height: 1.75; color: #D1D5DB; }

/* 盲注时刻表 */
.tt { margin-top: 20rpx; padding: 4rpx 24rpx; border-radius: 24rpx; background: #050505; }
.tr { display: grid; grid-template-columns: 96rpx 1fr 120rpx 104rpx; align-items: center; height: 64rpx; border-bottom: 4rpx solid #262626; }
.tr-last { border-bottom: 0; }
.thd { height: 56rpx; }
.thd .tc { font-family: "BoardHei", "PingFang SC", sans-serif; font-weight: 900; font-size: 24rpx; color: #8F8F8A; }
.tc { text-align: center; white-space: nowrap; font-family: "BoardNum", "DIN Alternate", sans-serif; font-weight: 700; font-size: 34rpx; color: #F2F2EE; }
.tc-dur { display: flex; align-items: baseline; justify-content: center; }
.tc-u { margin-left: 2rpx; font-family: "BoardHei", "PingFang SC", sans-serif; font-weight: 900; font-size: 22rpx; }
.tx { grid-column: 1 / 4; display: flex; align-items: center; padding-left: 24rpx; }
.tx-c { grid-column: 1 / 5; }
.tx-t { margin-left: 12rpx; font-family: "BoardHei", "PingFang SC", sans-serif; font-weight: 900; font-size: 26rpx; }
.tx-b .tx-t { color: #FFC53A; }
.tx-c .tx-t { color: #FF5646; }
.tt-more { margin: 16rpx auto 0; width: 300rpx; height: 64rpx; display: flex; align-items: center; justify-content: center; }
.tt-more-t { margin-right: 8rpx; font-size: 26rpx; color: #9CA3AF; }

/* 主持人、已报名 */
.hosts { margin-top: 24rpx; display: flex; }
.host { width: 128rpx; margin-right: 28rpx; display: flex; flex-direction: column; align-items: center; }
.host-n { margin-top: 20rpx; max-width: 128rpx; font-size: 24rpx; color: #E5E7EB; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.host-r { margin-top: 4rpx; font-size: 22rpx; color: #6B7280; }
.host-r-owner { color: #F4B740; }
.host-r-dealer { color: #9CA3AF; }
.sec-n { font-size: 24rpx; color: #6B7280; }
.chip-tag { background: #2A1216; color: #FF8A8A; }
.chip-pending { background: rgba(255, 197, 58, .1); color: #FFC53A; }
.chip-st { margin-left: 6rpx; font-size: 20rpx; }
.av-v { position: absolute; right: -6rpx; bottom: -6rpx; width: 26rpx; height: 26rpx; box-sizing: border-box; border-radius: 50%; background: #DC0000; border: 3rpx solid #181A20; display: flex; align-items: center; justify-content: center; }
.av-photo { overflow: hidden; }
.av-img { width: 100%; height: 100%; }
/* 规程 */
.rl { margin-top: 28rpx; }
.rl-h2 { margin-top: 20rpx; padding-left: 24rpx; }
.rl-head { display: flex; align-items: center; }
.rl-bar { width: 8rpx; height: 32rpx; margin-right: 14rpx; border-radius: 4rpx; background: #DC0000; }
.rl-t { font-size: 30rpx; font-weight: 600; color: #FFFFFF; }
.rl-h2 .rl-t { font-size: 27rpx; color: #E5E7EB; }
.rl-b { display: block; margin-top: 10rpx; font-size: 27rpx; line-height: 1.75; color: #D1D5DB; white-space: pre-wrap; }
.rmc-pro { margin-top: 12rpx; padding: 0 8rpx; display: flex; align-items: center; }
.rmc-pro-t { margin-left: 8rpx; font-size: 22rpx; color: #9CA3AF; }
.people { margin-top: 24rpx; display: flex; align-items: center; }
.stack { display: flex; }
.people-t { margin-left: 24rpx; font-size: 26rpx; color: #9CA3AF; }

/* 底部 */
.bar {
  position: fixed; z-index: 30; left: 0; right: 0; bottom: 0;
  padding: 20rpx 32rpx calc(24rpx + env(safe-area-inset-bottom)); background: #181A20; border-top: 1px solid #24272F;
}
.bar-note { display: flex; justify-content: center; font-size: 24rpx; line-height: 36rpx; color: #9CA3AF; }
.lnk { color: #FF4D4D; font-weight: 500; }
.bar-row { display: flex; margin-top: 16rpx; }
.bar-share {
  width: 96rpx; height: 96rpx; flex: none; margin: 0 20rpx 0 0; padding: 0; line-height: normal; border-radius: 50%;
  background: #35383F; display: flex; align-items: center; justify-content: center;
}
.bar-share::after { border: none; }
/* 盲注结构：特殊级别的气泡说明 */
.tr-sp { position: relative; }
.tr-on { background: rgba(220, 0, 0, .14); }
.tc-ante { color: #FF8A8A; }
.bp { position: relative; margin: 2rpx 12rpx 12rpx; padding: 18rpx 22rpx 20rpx; border-radius: 18rpx; background: #2A1216; box-shadow: inset 0 0 0 2rpx rgba(220, 0, 0, .45); animation: bp-in .2s ease-out; }
@keyframes bp-in { from { opacity: 0; transform: translateY(-8rpx); } to { opacity: 1; transform: none; } }
.bp-arrow { position: absolute; left: 60rpx; top: -10rpx; width: 20rpx; height: 20rpx; background: #2A1216; transform: rotate(45deg); box-shadow: -2rpx -2rpx 0 0 rgba(220, 0, 0, .45); }
.bp-h { display: flex; align-items: center; justify-content: space-between; }
.bp-t { font-size: 26rpx; font-weight: 700; color: #FFFFFF; }
.bp-src { font-size: 20rpx; color: #FF8A8A; }
.bp-d { display: block; margin-top: 8rpx; font-size: 24rpx; line-height: 1.6; color: #E5E7EB; }
/* 已报名：头像墙 */
.rw { margin-top: 24rpx; padding: 24rpx; border-radius: 28rpx; background: #1F222A; }
.rw-grid { display: flex; flex-wrap: wrap; }
.rw-av { position: relative; width: 72rpx; height: 72rpx; margin: 0 14rpx 14rpx 0; box-sizing: border-box; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 26rpx; font-weight: 500; }
.rw-pending { box-shadow: 0 0 0 3rpx #FFC53A; opacity: .75; }
.rw-checked { box-shadow: 0 0 0 3rpx #4CB582; }
.rw-badge { position: absolute; right: -4rpx; bottom: -4rpx; width: 26rpx; height: 26rpx; box-sizing: border-box; border-radius: 50%; border: 3rpx solid #1F222A; display: flex; align-items: center; justify-content: center; }
.rw-badge-ok { background: #4CB582; }
.rw-badge-wait { background: #FFC53A; }
.rw-more { background: #35383F; color: #E5E7EB; font-size: 22rpx; }
.rw-empty { padding: 12rpx 0 20rpx; font-size: 24rpx; color: #9CA3AF; }
.rw-sum { display: flex; align-items: center; flex-wrap: wrap; }
.rw-s { margin-right: 22rpx; display: flex; align-items: center; }
.rw-dot { width: 14rpx; height: 14rpx; margin-right: 8rpx; border-radius: 50%; }
.rw-s-t { font-size: 22rpx; color: #9CA3AF; }
.rw-open { margin-left: auto; display: flex; align-items: center; }
.rw-open-t { font-size: 24rpx; color: #E5E7EB; }
/* 我的签到码 */
.mk { margin-top: 20rpx; padding: 22rpx; border-radius: 28rpx; background: #F3EEE6; display: flex; align-items: center; }
.mk-qr { width: 168rpx; height: 168rpx; flex: none; border-radius: 12rpx; background: #FFFFFF; }
.mk-main { margin-left: 24rpx; display: flex; flex-direction: column; }
.mk-t { font-size: 24rpx; color: #4B5060; }
.mk-code { margin-top: 4rpx; font-family: "BoardNum", sans-serif; font-weight: 800; font-size: 64rpx; letter-spacing: 10rpx; line-height: 1.1; color: #0B0C10; }
.mk-s { margin-top: 4rpx; font-size: 22rpx; color: #6B7280; }
.mk-wait { background: rgba(255, 197, 58, .1); }
.mk-wait-t { margin-left: 12rpx; font-size: 24rpx; color: #FFC53A; }
/* 名单抽屉 */
.sheet-r { position: absolute; left: 0; right: 0; bottom: 0; max-height: 84vh; padding: 16rpx 32rpx calc(28rpx + env(safe-area-inset-bottom)); box-sizing: border-box; background: #262A34; border-radius: 48rpx 48rpx 0 0; display: flex; flex-direction: column; animation: ov-up .22s ease-out; }
.sr-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 18rpx; }
.sr-head-t { display: flex; align-items: baseline; }
.sr-head-t .sr-sub { margin-left: 14rpx; }
.sr-scan { width: 80rpx; height: 80rpx; flex: none; border-radius: 22rpx; background: #DC0000; display: flex; align-items: center; justify-content: center; }
.sr-sel { margin-left: auto; height: 56rpx; padding: 0 24rpx; border-radius: 999rpx; box-shadow: inset 0 0 0 2rpx #FF6B6B; display: flex; align-items: center; }
.sr-sel-t { font-size: 24rpx; font-weight: 600; color: #FF6B6B; }
.sr-selbar { height: 76rpx; margin-bottom: 8rpx; padding: 0 10rpx 0 18rpx; border-radius: 20rpx; background: #1F222A; display: flex; align-items: center; }
.sr-all { display: flex; align-items: center; }
.sr-ck { width: 38rpx; height: 38rpx; flex: none; box-sizing: border-box; border-radius: 10rpx; border: 3rpx solid #6B7280; display: flex; align-items: center; justify-content: center; }
.sr-ck-on { border-color: #DC0000; background: #DC0000; }
.sr-ck-row { margin-right: 18rpx; }
.sr-all-t { margin-left: 12rpx; font-size: 26rpx; color: #FFFFFF; }
.sr-picked { margin-left: 18rpx; font-size: 24rpx; color: #9CA3AF; }
.sr-cancel { margin-left: auto; padding: 0 22rpx; font-size: 24rpx; color: #9CA3AF; }
.sr-ok { height: 56rpx; padding: 0 26rpx; border-radius: 999rpx; background: #DC0000; display: flex; align-items: center; }
.sr-ok-dis { opacity: .45; }
.sr-ok-t { font-size: 24rpx; font-weight: 600; color: #FFFFFF; }
.sj-remind { margin-top: 18rpx; padding: 16rpx 20rpx; border-radius: 18rpx; background: rgba(255, 197, 58, .1); display: flex; align-items: center; }
.sj-remind-t { margin-left: 10rpx; font-size: 23rpx; color: #FFD27A; }
.sr-title { font-size: 32rpx; font-weight: 600; color: #FFFFFF; }
.sr-sub { font-size: 24rpx; color: #9CA3AF; }
.sr-tabs { display: flex; align-items: center; margin-bottom: 8rpx; }
.sr-tab { height: 56rpx; margin-right: 12rpx; padding: 0 20rpx; border-radius: 999rpx; background: #1F222A; display: flex; align-items: center; font-size: 22rpx; color: #9CA3AF; }
.sr-tab-on { background: #FFFFFF; color: #0B0C10; font-weight: 600; }
.sr-list { max-height: 760rpx; }
.sr-row { display: flex; align-items: center; padding: 18rpx 0; border-bottom: 1rpx solid #2E313A; }
.sr-av { width: 72rpx; height: 72rpx; flex: none; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 26rpx; font-weight: 500; }
.sr-main { flex: 1; min-width: 0; margin: 0 16rpx 0 20rpx; }
.sr-top { display: flex; align-items: center; }
.sr-n { font-size: 28rpx; font-weight: 500; color: #FFFFFF; }
.sr-me { margin-left: 10rpx; padding: 0 10rpx; border-radius: 8rpx; background: rgba(220, 0, 0, .2); font-size: 20rpx; color: #FF8A8A; }
.sr-s { display: block; margin-top: 4rpx; font-size: 22rpx; color: #9CA3AF; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.sr-btn { height: 56rpx; padding: 0 24rpx; border-radius: 999rpx; background: #DC0000; display: flex; align-items: center; }
.sr-btn-2 { background: #35383F; }
.sr-btn-t { font-size: 24rpx; font-weight: 600; color: #FFFFFF; }
.sr-pill { height: 44rpx; padding: 0 16rpx; border-radius: 999rpx; display: flex; align-items: center; font-size: 22rpx; }
.sr-empty { display: block; padding: 40rpx 0; text-align: center; font-size: 24rpx; color: #9CA3AF; }
/* 9:16 海报预览 */
.ov-c { display: flex; align-items: center; justify-content: center; }
.pst { position: relative; width: 560rpx; display: flex; flex-direction: column; align-items: center; }
.pst-img { width: 504rpx; height: 816rpx; }
.pst-loading { border-radius: 24rpx; background: #1F222A; display: flex; align-items: center; justify-content: center; font-size: 26rpx; color: #9CA3AF; }
.pst-acts { margin-top: 28rpx; width: 100%; display: flex; }
.pst-btn { flex: 1; height: 88rpx; margin-left: 16rpx; border-radius: 999rpx; background: #DC0000; display: flex; align-items: center; justify-content: center; }
.pst-btn-2 { margin-left: 0; flex: none; width: 180rpx; background: #35383F; }
.pst-btn-dis { opacity: .5; }
.pst-btn-t { margin-left: 8rpx; font-size: 28rpx; font-weight: 600; color: #FFFFFF; }
/* 去分享：冒泡裂开成两个图标 */
.shr { position: relative; z-index: 2; width: 220rpx; height: 96rpx; flex: none; margin-right: 20rpx; display: flex; align-items: center; justify-content: space-between; }
.shr-pill { width: 100%; height: 96rpx; border-radius: 999rpx; background: #35383F; display: flex; align-items: center; justify-content: center; animation: shr-in .22s ease-out; }
.shr-t { margin-left: 8rpx; font-size: 28rpx; font-weight: 600; color: #FFFFFF; }
.shr-b { width: 96rpx; height: 96rpx; margin: 0; padding: 0; line-height: normal; border-radius: 50%; background: #35383F; display: flex; align-items: center; justify-content: center; box-shadow: 0 10rpx 24rpx rgba(0, 0, 0, .35); }
.shr-b::after { border: none; }
.shr-b-l { animation: shr-l .36s cubic-bezier(.34, 1.56, .64, 1); }
.shr-b-r { background: #DC0000; animation: shr-r .36s cubic-bezier(.34, 1.56, .64, 1); }
@keyframes shr-l { from { transform: translateX(62rpx) scale(.5); opacity: .4; } to { transform: none; opacity: 1; } }
@keyframes shr-r { from { transform: translateX(-62rpx) scale(.5); opacity: .4; } to { transform: none; opacity: 1; } }
@keyframes shr-in { from { transform: scale(.85); opacity: .6; } to { transform: none; opacity: 1; } }
/* 在底部栏（z-index 30）下面、页面内容上面，点了收回，不会挡住两个图标 */
.shr-catch { position: fixed; z-index: 25; left: 0; top: 0; right: 0; bottom: 0; }
.inviter-heat { margin-left: auto; padding-left: 16rpx; flex: none; }
.rw-left { display: block; font-size: 24rpx; color: #9CA3AF; }
.cv-off { position: fixed; left: -2000px; top: 0; width: 840px; height: 1360px; }

.bar-share-wide { width: auto; padding: 0 36rpx; border-radius: 999rpx; }
.bar-share-t { margin-left: 8rpx; font-size: 28rpx; font-weight: 600; color: #FFFFFF; }
/* 主办方视图：房间码 */
.rmc { position: relative; margin-top: 24rpx; padding: 24rpx 24rpx 24rpx 28rpx; border-radius: 28rpx; background: #1F222A; box-shadow: inset 0 0 0 2rpx rgba(255, 181, 71, .22); display: flex; align-items: center; }
.rmc-new { animation: rmc-glow 1.2s ease-in-out 3; }
@keyframes rmc-glow { 50% { box-shadow: inset 0 0 0 3rpx #FFB547, 0 0 40rpx rgba(255, 181, 71, .45); } }
.rmc-l { flex: 1; min-width: 0; }
.rmc-k { display: flex; align-items: center; }
.rmc-k-t { margin-left: 8rpx; font-size: 22rpx; color: #9CA3AF; }
.rmc-code { display: block; margin-top: 8rpx; font-family: "BoardNum", "DIN Alternate", sans-serif; font-weight: 800; font-size: 60rpx; line-height: 1; letter-spacing: 8rpx; color: #FFB547; }
.rmc-new-tag { margin-right: 16rpx; padding: 4rpx 14rpx; border-radius: 999rpx; background: rgba(255, 181, 71, .16); font-size: 20rpx; color: #FFB547; }
.rmc-copy { height: 64rpx; padding: 0 22rpx; border-radius: 999rpx; background: #35383F; display: flex; align-items: center; }
.rmc-copy-t { margin-left: 8rpx; font-size: 24rpx; font-weight: 600; color: #FFFFFF; }
.bar-main {
  flex: 1; height: 96rpx; border-radius: 999rpx; background: #DC0000; box-shadow: 0 12rpx 36rpx rgba(220, 0, 0, .35);
  display: flex; align-items: center; justify-content: center;
}
.bar-wait { background: #35383F; box-shadow: none; }
.bar-main-t { margin-left: 12rpx; font-size: 32rpx; font-weight: 500; color: #FFFFFF; }
.bar-main-t-wait { color: #9CA3AF; }

/* 报名弹层 */
@keyframes ov-up { from { transform: translateY(100%); } to { transform: translateY(0); } }
.ov { position: fixed; z-index: 100; left: 0; top: 0; right: 0; bottom: 0; }
.mask { position: absolute; left: 0; top: 0; right: 0; bottom: 0; background: rgba(0, 0, 0, .6); }
.sheet-j {
  position: absolute; left: 0; right: 0; bottom: 0; padding: 16rpx 32rpx calc(40rpx + env(safe-area-inset-bottom));
  background: #262A34; border-radius: 48rpx 48rpx 0 0; animation: sj-up .22s ease-out;
}
@keyframes sj-up { from { transform: translateY(100%); } to { transform: translateY(0); } }
.grab { width: 72rpx; height: 8rpx; margin: 0 auto 24rpx; border-radius: 4rpx; background: #4A4D57; }
.sj-title { display: block; font-size: 32rpx; font-weight: 500; color: #FFFFFF; }
.sj-sum { margin-top: 24rpx; padding: 20rpx; border-radius: 28rpx; background: #1F222A; display: flex; align-items: center; }
.sj-cover { width: 128rpx; height: 88rpx; flex: none; border-radius: 16rpx; background-size: cover; background-position: center; }
.sj-sum-t { margin-left: 20rpx; min-width: 0; display: flex; flex-direction: column; }
.sj-name { font-size: 28rpx; font-weight: 500; color: #FFFFFF; }
.sj-meta { margin-top: 8rpx; font-size: 24rpx; color: #9CA3AF; }
.sj-lb { margin-top: 32rpx; display: flex; justify-content: space-between; font-size: 26rpx; font-weight: 500; color: #9CA3AF; }
.sj-count { font-weight: 400; color: #6B7280; }
.sj-msg { margin-top: 16rpx; width: 100%; height: 152rpx; box-sizing: border-box; padding: 20rpx 24rpx; border-radius: 24rpx; background: #1F222A; font-size: 28rpx; line-height: 1.6; color: #FFFFFF; }
.sj-note { display: block; margin-top: 20rpx; font-size: 24rpx; color: #9CA3AF; }
.sj-ok { margin-top: 28rpx; height: 96rpx; border-radius: 999rpx; background: #DC0000; display: flex; align-items: center; justify-content: center; }
.sj-ok-t { margin-left: 12rpx; font-size: 32rpx; font-weight: 500; color: #FFFFFF; }
</style>
