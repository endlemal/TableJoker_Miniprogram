<template>
  <page-meta :page-style="overlayOpen ? 'overflow:hidden' : ''"></page-meta>
  <view class="page">
    <!-- 导航 -->
    <view class="nav" :style="navStyle">
      <view class="back" :style="backStyle" hover-class="press" @tap="goBackOrHome"><z-icon name="arrow-left" :size="20" color="#FFFFFF" /></view>
      <text class="nav-title">创建比赛</text>
    </view>

    <view class="body">
      <!-- 比赛封面 -->
      <text class="lb">比赛封面</text>
      <view class="cv">
        <image v-if="form.coverImage" class="cv-fill" :src="form.coverImage" mode="aspectFill" />
        <view v-else class="cv-fill cv-art" :style="coverStyle(form.cover, 'banner')"></view>
      </view>
      <view class="cv-cap">
        <text class="cv-name">{{ form.coverImage ? '自定义封面' : coverInfo.name }}</text>
        <text class="cv-line">{{ form.coverImage ? '点下面的场景可以换回插画' : coverInfo.line }}</text>
      </view>
      <view class="strip">
        <view
          v-for="c in coverScenes"
          :key="c.key"
          class="th"
          :class="{ 'th-on': !form.coverImage && form.cover === c.key }"
          :style="coverStyle(c.key, 'share')"
          @tap="pickScene(c.key)"
        >
          <view v-if="!form.coverImage && form.cover === c.key" class="th-ck"><z-icon name="check" :size="10" :stroke="3" color="#FFFFFF" /></view>
        </view>
        <view class="th th-up" :class="{ 'th-on': !!form.coverImage }" @tap="uploadCover">
          <z-icon name="photo-plus" :size="18" color="#9CA3AF" />
        </view>
      </view>

      <!-- 比赛名称 -->
      <text class="lb lb-gap">比赛名称</text>
      <view class="fd name">
        <input v-model="form.name" class="name-input" maxlength="20" placeholder="给比赛起个名字" placeholder-class="ph" />
        <text class="count">{{ form.name.length }}/20</text>
      </view>

      <!-- 盲注结构 / 日期 / 人数上限 -->
      <view class="row3">
        <view class="col-blind">
          <text class="lb">盲注结构</text>
          <view class="fd field" hover-class="press-soft" @tap="picker = true">
            <view class="field-main">
              <text class="field-v">{{ currentScheme ? currentScheme.name : '未选择' }}</text>
              <text class="field-s">{{ blindSummary }}</text>
            </view>
            <z-icon name="chevron-right" :size="16" color="#6B7280" />
          </view>
        </view>
        <view class="col-date">
          <text class="lb">日期</text>
          <view class="fd field field-col" hover-class="press-soft" @tap="openDate">
            <text class="field-s">{{ dateText.day }}</text>
            <text class="field-v">{{ dateText.time }}</text>
          </view>
        </view>
        <view class="col-cap">
          <text class="lb">人数上限</text>
          <view class="fd field field-cap" hover-class="press-soft" @tap="openCap">
            <text class="cap-v">{{ form.cap }}</text>
            <text class="cap-u">人</text>
          </view>
        </view>
      </view>

      <!-- 地点：先确认位置授权，再打开微信地图选点 -->
      <text class="lb lb-gap">地点</text>
      <view class="fd loc" hover-class="press-soft" @tap="pickLocation">
        <view class="loc-ic"><z-icon name="map-pin" :size="18" :color="form.location ? '#FF4D4D' : '#9CA3AF'" /></view>
        <view class="loc-main">
          <text class="loc-name" :class="{ 'loc-ph': !form.location }">{{ form.location ? form.location.name : '在地图上选择比赛地点' }}</text>
          <text v-if="form.location && form.location.address" class="loc-addr">{{ form.location.address }}</text>
        </view>
        <z-icon name="chevron-right" :size="16" color="#6B7280" />
      </view>

      <!-- 比赛介绍：弹层打开时换成静态文字，避免原生 textarea 盖住弹层。
           主办方上限 1000 字（介绍和各段落合计），可以按一级 / 二级标题分段写规程 -->
      <view class="lb-row lb-gap">
        <text class="lb">{{ isHost ? '比赛介绍与规程' : '比赛介绍' }}</text>
        <text v-if="isHost" class="count" :class="{ 'count-full': introUsed >= introMax }">{{ introUsed }}/{{ introMax }}</text>
      </view>
      <view class="fd intro-box">
        <textarea v-if="!overlayOpen" v-model="form.intro" class="intro" :maxlength="fieldMax(form.intro)" placeholder="说说赛制、休息安排和注意事项" placeholder-class="ph" />
        <text v-else class="intro intro-static">{{ form.intro || '说说赛制、休息安排和注意事项' }}</text>
        <text v-if="!isHost" class="count count-abs">{{ form.intro.length }}/{{ introMax }}</text>
      </view>
      <block v-if="isHost">
        <view v-for="(r, i) in form.rules" :key="r.id" class="fd rule" :class="r.level === 1 ? 'rule-h1' : 'rule-h2'">
          <view class="rule-top">
            <view class="rule-lv" hover-class="press" @tap="r.level = r.level === 1 ? 2 : 1"><text>{{ r.level === 1 ? '一级标题' : '二级标题' }}</text></view>
            <input v-model="r.title" class="rule-title" :maxlength="fieldMax(r.title, 20)" :focus="focusRule === r.id" :placeholder="r.level === 1 ? '一级标题' : '二级标题'" placeholder-class="ph" @blur="focusRule = ''" />
            <view v-if="i > 0" class="rule-act" hover-class="press" @tap="moveRule(i, -1)"><z-icon name="arrow-up" :size="14" color="#9CA3AF" /></view>
            <view v-if="i < form.rules.length - 1" class="rule-act" hover-class="press" @tap="moveRule(i, 1)"><z-icon name="arrow-down" :size="14" color="#9CA3AF" /></view>
            <view class="rule-act" hover-class="press" @tap="form.rules.splice(i, 1)"><z-icon name="x" :size="13" :stroke="2.5" color="#B86A6A" /></view>
          </view>
          <textarea v-if="!overlayOpen" v-model="r.body" class="rule-body" auto-height :maxlength="fieldMax(r.body)" placeholder="正文" placeholder-class="ph" />
          <text v-else class="rule-body rule-body-static">{{ r.body || '正文' }}</text>
        </view>
        <view class="rule-adds">
          <view class="rule-add" hover-class="press" @tap="addRule(1)"><z-icon name="plus" :size="14" color="#FF6B6B" /><text class="rule-add-t">一级标题</text></view>
          <view class="rule-add rule-add-2" hover-class="press" @tap="addRule(2)"><z-icon name="plus" :size="14" color="#9CA3AF" /><text class="rule-add-t">二级标题</text></view>
        </view>
      </block>

      <!-- 共同主持 -->
      <view class="host-head">
        <text class="lb">共同主持</text>
        <text class="host-sum">{{ hostSummary }}</text>
      </view>
      <scroll-view class="hosts" scroll-x :show-scrollbar="false">
        <view class="hosts-row">
          <view class="host">
            <view class="host-av host-me"><text>{{ me.char }}</text></view>
            <text class="host-n">我</text>
            <text class="host-s host-s-me">发起人</text>
          </view>
          <view v-for="h in hosts" :key="h.id" class="host">
            <view class="host-av" :class="{ 'host-wait': h.status === 'pending' }" :style="h.status === 'pending' ? '' : 'background:' + h.bg + ';color:' + h.fg">
              <text>{{ h.c }}</text>
              <view class="host-x" @tap.stop="removeHost(h)"><z-icon name="x" :size="10" :stroke="3" color="#E5E7EB" /></view>
              <view v-if="h.status === 'pending'" class="host-hg"><z-icon name="hourglass" :size="10" :stroke="2.5" color="#3A2A00" /></view>
            </view>
            <text class="host-n">{{ h.name }}</text>
            <text class="host-s" :class="{ 'host-s-wait': h.status === 'pending' }">{{ h.status === 'pending' ? '待接受' : '已加入' }}</text>
          </view>
          <view class="host" hover-class="press" @tap="toast('从好友里选择共同主持（待接入）')">
            <view class="host-av host-add"><z-icon name="user-plus" :size="20" color="#E5E7EB" /></view>
            <text class="host-n host-n-add">邀请</text>
          </view>
        </view>
      </scroll-view>

      <!-- 开关 -->
      <view class="fd sw-row">
        <view class="sw-text">
          <text class="sw-title">赛事公开</text>
          <text class="sw-sub">{{ form.isPublic ? '公开后会出现在广场，所有人都能报名' : '不出现在广场，只有收到邀请的人能加入' }}</text>
        </view>
        <view class="sw" :class="{ 'sw-on': form.isPublic }" @tap="form.isPublic = !form.isPublic"><view class="sw-knob"></view></view>
      </view>
      <view class="more"><text class="lb">更多设置</text><view class="more-line"></view></view>
      <view class="fd sw-row sw-row-tight">
        <view class="sw-text">
          <text class="sw-title">加入房间自动通过</text>
          <text class="sw-sub">{{ form.autoApprove ? '报名后直接进入房间，不需要审核' : '加入申请需要你或共同主持审核' }}</text>
        </view>
        <view class="sw" :class="{ 'sw-on': form.autoApprove }" @tap="form.autoApprove = !form.autoApprove"><view class="sw-knob"></view></view>
      </view>

      <!-- 主办方专属：只有认证主办方看得到；选中的内容直接显示在页面上 -->
      <block v-if="isHost">
        <view class="more"><text class="lb">主办方专属</text><view class="pro-badge"><z-icon name="crown" :size="11" color="#F4B740" /><text class="pro-badge-t">主办方</text></view><view class="more-line"></view></view>

        <!-- 现场大屏：每台电视一个灰色图标，横着排、放不下就换行；第一行以外的折叠起来，点「展开更多」再显示。点图标选中，选中的亮起来 -->
        <view class="lb-row lb-row-first"><text class="lb">现场大屏</text><text class="count">已选 {{ form.screens.length }} 台</text></view>
        <view v-if="loadedDevices && !devices.length" class="fd add-box" hover-class="press-soft" @tap="toDevices">
          <z-icon name="device-tv" :size="18" color="#9CA3AF" /><text class="add-box-t">还没有绑定大屏，去设备管理添加</text>
        </view>
        <view class="tvis">
          <view v-for="d in shownDevices" :key="d.id" class="tvi" :class="{ 'tvi-on': form.screens.includes(d.id), 'tvi-off': !isOnline(d) }" hover-class="press" @tap="toggleScreen(d)">
            <view class="tvi-ic">
              <z-icon name="device-tv" :size="30" :stroke="1.6" :color="form.screens.includes(d.id) ? '#FFFFFF' : '#4B5060'" />
              <view class="tvi-dot" :class="{ 'tvi-dot-on': isOnline(d) }"></view>
            </view>
            <text class="tvi-n">{{ d.name.slice(0, 5) }}</text>
          </view>
        </view>
        <view v-if="devices.length > PER_ROW" class="tvi-more" hover-class="press" @tap="screensMore = !screensMore">
          <text class="tvi-more-t">{{ screensMore ? '收起' : '展开更多（还有 ' + (devices.length - PER_ROW) + ' 台' + (hiddenPicked ? '，已选 ' + hiddenPicked + ' 台' : '') + '）' }}</text>
          <z-icon :name="screensMore ? 'chevron-up' : 'chevron-down'" :size="14" color="#9CA3AF" />
        </view>

        <!-- 房间 TV 主题：左边是所选主题的封面，右边是竖着排的主题列表（可滚动） -->
        <view class="lb-row lb-gap"><text class="lb">房间 TV 主题</text><text class="count">{{ theme.name }} · {{ theme.desc }}</text></view>
        <view class="tvt">
          <view class="tvt-cover"><image class="tvt-img" :src="theme.cover" mode="aspectFill" /></view>
          <scroll-view scroll-y class="tvt-list" :scroll-into-view="'th-' + theme.key">
            <view v-for="t in TV_THEMES" :id="'th-' + t.key" :key="t.key" class="tvt-i" :class="{ 'tvt-on': form.tvTheme.key === t.key }" hover-class="press-soft" @tap="form.tvTheme.key = t.key">
              <image class="tvt-thumb" :src="t.cover" mode="aspectFill" />
              <text class="tvt-n">{{ t.name }}</text>
            </view>
          </scroll-view>
        </view>

        <!-- 驻场荷官：头像添加式（和共同主持一样）；点 × 移出，点「添加」从工作台荷官名册里选 -->
        <view class="host-head lb-gap"><text class="lb">驻场荷官</text><text class="host-sum">{{ dealerPicked.length ? dealerPicked.length + ' 位 · 只作信息展示' : '只作信息展示，不关联账号' }}</text></view>
        <scroll-view class="hosts" scroll-x :show-scrollbar="false">
          <view class="hosts-row">
            <view v-for="d in dealerPicked" :key="d.id" class="host">
              <view class="host-av dav" :style="'background:' + d.bg + ';color:' + d.fg">
                <image v-if="d.photo" class="dav-img" :src="d.photo" mode="aspectFill" />
                <text v-else>{{ d.char }}</text>
                <view class="host-x" @tap.stop="toggleDealer(d)"><z-icon name="x" :size="10" :stroke="3" color="#E5E7EB" /></view>
              </view>
              <text class="host-n">{{ d.name }}</text>
              <text class="host-s dav-title">{{ d.title }}</text>
            </view>
            <view class="host" hover-class="press" @tap="dealersOpen = true">
              <view class="host-av host-add"><z-icon name="user-plus" :size="20" color="#E5E7EB" /></view>
              <text class="host-n host-n-add">添加</text>
            </view>
          </view>
        </scroll-view>

        <!-- 比赛标签：2 个预设 + 自定义；自定义的要审核，通过后才公开显示 -->
        <view class="lb-row lb-gap"><text class="lb">比赛标签</text><text class="count">{{ form.tags.length }}/{{ MAX_TAGS }}</text></view>
        <view class="tags">
          <view v-for="t in tagChips" :key="t.text" class="tg" :class="['tg-' + t.state, { 'tg-on': t.on }]" hover-class="press" @tap="toggleTag(t)">
            <z-icon v-if="t.state === 'pending'" name="hourglass" :size="12" color="#FFC53A" />
            <text class="tg-t">{{ t.text }}</text>
            <text v-if="t.state === 'pending'" class="tg-st">审核中</text>
            <text v-else-if="t.state === 'rejected'" class="tg-st tg-st-bad">未通过</text>
            <z-icon v-else-if="t.on" name="check" :size="12" :stroke="2.5" color="#FF6B6B" />
          </view>
          <view v-if="tagInput" class="tg tg-input"><input v-model="tagDraft" class="tg-in" :maxlength="TAG_MAX_LEN" focus confirm-type="done" placeholder="最多 6 个字" placeholder-class="ph" @confirm="commitTag" @blur="commitTag" /></view>
          <view v-else class="tg tg-add" hover-class="press" @tap="startTag"><z-icon name="plus" :size="12" color="#9CA3AF" /><text class="tg-t tg-add-t">自定义</text></view>
        </view>
        <text class="tg-hint">自定义标签提交后要审核，通过后才会公开显示</text>
      </block>
    </view>

    <!-- 底部：方案 + 去发布。分享统一放在发布后的比赛邀请页 -->
    <view class="bar">
      <view class="bar-plan" hover-class="press" @tap="tplOpen = true">
        <z-icon name="stack-2" :size="18" color="#FFFFFF" />
        <text class="bar-plan-t">方案</text>
      </view>
      <button class="bar-pub" :class="{ 'bar-pub-busy': publishing }" hover-class="press" @tap="onPublish">
        <view v-if="publishing" class="bar-spin"><z-icon name="loader-2" :size="18" color="#FFFFFF" /></view>
        <z-icon v-else name="send" :size="18" color="#FFFFFF" />
        <text class="bar-pub-t">{{ publishing ? '发布中…' : '去发布' }}</text>
      </button>
    </view>
    <z-pop :show="pop.show" :text="pop.text" :icon="pop.icon" :tone="pop.tone" />

    <!-- 盲注方案选择 -->
    <view v-if="picker" class="ov">
      <view class="mask" @tap="picker = false" @touchmove.stop.prevent="noop"></view>
      <view class="sheet">
        <view class="grab"></view>
        <view class="sh-head">
          <text class="sh-title">盲注方案</text>
          <text class="sh-sub">{{ schemes.length }}/{{ maxSlots }}</text>
        </view>
        <scroll-view scroll-y class="tiles-scroll" :class="{ 'tiles-scroll-host': isHost }"><view class="tiles">
          <view v-for="t in schemeTiles" :key="t.id" class="tile" :class="{ 'tile-on': t.on }" hover-class="press-soft" @tap="chooseScheme(t.id)" @longpress="schemeActions(t)">
            <text class="tile-name">{{ t.name }}</text>
            <view class="tile-flaps"><text class="mf">{{ t.start[0] }}</text><text class="mf-sl">/</text><text class="mf">{{ t.start[1] }}</text></view>
            <text class="tile-meta" :class="{ 'tile-meta-on': t.on }">{{ t.on ? '使用中' : t.count + ' 级' }}</text>
          </view>
          <view v-if="schemes.length < maxSlots" class="tile tile-new" hover-class="press" @tap="openEditor('')">
            <z-icon name="plus" :size="22" color="#FF4D4D" />
            <text class="tile-new-t">新建方案</text>
          </view>
          <view v-for="n in schemeEmpty" :key="'e' + n" class="tile tile-empty"></view>
        </view></scroll-view>
        <view v-if="isHost && currentScheme" class="saveas" hover-class="press" @tap="saveSchemeAs"><z-icon name="copy" :size="14" color="#FF6B6B" /><text class="saveas-t">把「{{ currentScheme.name }}」另存为新模板</text></view>
        <text class="sh-hint">{{ schemes.length >= maxSlots ? '已存满 ' + maxSlots + ' 个，长按方案可以删除' : '没有合适的就新建一个，长按方案可以编辑或删除' }}</text>
      </view>
    </view>

    <!-- 盲注编辑（悬浮遮罩） -->
    <view v-if="editor" class="ov">
      <view class="mask" @touchmove.stop.prevent="noop"></view>
      <view class="ed" :style="edStyle">
        <view class="ed-head">
          <input v-model="draft.name" class="ed-name" maxlength="8" placeholder="方案名称" placeholder-class="ph" />
          <text class="ed-count">{{ draftLevels }} 级</text>
          <view class="ed-close" hover-class="press" @tap="editor = false"><z-icon name="x" :size="16" color="#9CA3AF" /></view>
        </view>
        <view class="eg ed-cols">
          <text class="ed-col"></text><text class="ed-col">级</text><text class="ed-col">小盲</text><text class="ed-col">大盲</text><text class="ed-col">前注</text><text class="ed-col">分钟</text><text class="ed-col"></text>
        </view>
        <scroll-view class="ed-list" scroll-y :scroll-into-view="edAnchor" :scroll-top="edScrollTop" :scroll-with-animation="drag.from < 0" @scroll="onEdScroll">
          <view v-for="(r, i) in draft.rows" :id="'r' + r.k" :key="r.k" class="eg ed-row" :class="{ 'ed-row-drag': drag.from === i }" :style="rowStyle(i)">
            <!-- 按住左侧把手上下拖动，调整这一行的位置。只拦 touchmove（挡住列表滚动），不拦 touchstart，以免小程序里的点击失效 -->
            <view class="ed-grip" @touchstart="dragStart(i, $event)" @touchmove.stop.prevent="dragMove" @touchend="dragEnd" @touchcancel="dragEnd"><z-icon name="grip-vertical" :size="16" color="#6B7280" /></view>
            <block v-if="r.t === 'L'">
              <view class="ed-no ed-no-tap" hover-class="press" @tap="openNote(i)"><text>{{ levelNo[i] }}</text><view v-if="noteMark(i)" class="ed-note-dot" :class="{ 'ed-note-dot-c': hasNote(r) }"></view></view>
              <input
                v-for="f in cellKeys"
                :key="f"
                class="ed-cell"
                :class="{ 'ed-cell-on': focusCell === r.k + f }"
                type="number"
                :value="String(r[f])"
                @input="setCell(i, f, $event)"
                @focus="focusCell = r.k + f"
                @blur="focusCell = ''"
              />
            </block>
            <block v-else-if="r.t === 'B'">
              <view class="ed-no"><z-icon name="coffee" :size="16" color="#C9A24A" /></view>
              <view class="ed-span ed-span-b" hover-class="press" @tap="openNote(i)"><text>休息</text><view class="ed-span-i"><z-icon name="info-circle" :size="14" color="#C9A24A" /><text v-if="hasNote(r)" class="ed-span-n">已写说明</text></view></view>
              <input
                class="ed-cell"
                :class="{ 'ed-cell-on': focusCell === r.k + 'min' }"
                type="number"
                :value="String(r.min)"
                @input="setCell(i, 'min', $event)"
                @focus="focusCell = r.k + 'min'"
                @blur="focusCell = ''"
              />
            </block>
            <block v-else>
              <view class="ed-no"><z-icon name="scissors" :size="16" color="#C86A6A" /></view>
              <view class="ed-span ed-span-c" hover-class="press" @tap="openNote(i)"><text>截止买入</text><view class="ed-span-i"><z-icon name="info-circle" :size="14" color="#C86A6A" /><text v-if="hasNote(r)" class="ed-span-n">已写说明</text></view></view>
              <view></view>
            </block>
            <view v-if="i > 0" class="ed-del" hover-class="press" @tap="draft.rows.splice(i, 1)"><z-icon name="x" :size="12" :stroke="2.5" color="#B86A6A" /></view>
            <view v-else></view>
          </view>
        </scroll-view>
        <view class="ed-adds">
          <view class="ed-add" hover-class="press" @tap="addRow('L')"><z-icon name="plus" :size="14" color="#9CA3AF" /><text class="ed-add-t">级别</text></view>
          <view class="ed-add" hover-class="press" @tap="addRow('B')"><z-icon name="coffee" :size="14" color="#C9A24A" /><text class="ed-add-t ed-add-b">休息</text></view>
          <view class="ed-add" hover-class="press" @tap="addRow('C')"><z-icon name="scissors" :size="14" color="#C86A6A" /><text class="ed-add-t ed-add-c">截止买入</text></view>
        </view>
        <view class="ed-actions">
          <view class="btn-2" hover-class="press" @tap="editor = false"><text>取消</text></view>
          <view class="btn-1" hover-class="press" @tap="saveScheme"><text>保存方案</text></view>
        </view>
      </view>
    </view>

    <!-- 日期选择 -->
    <view v-if="dateOpen" class="ov">
      <view class="mask" @tap="dateOpen = false" @touchmove.stop.prevent="noop"></view>
      <view class="sheet">
        <view class="grab"></view>
        <view class="sh-bar">
          <text class="sh-btn" @tap="dateOpen = false">取消</text>
          <text class="sh-title">比赛时间</text>
          <text class="sh-btn sh-ok" @tap="confirmDate">确定</text>
        </view>
        <view class="pv-cols"><text class="pv-col">日期</text><text class="pv-col">时</text><text class="pv-col">分</text></view>
        <picker-view class="pv" :value="dateVal" indicator-class="pv-ind" :mask-style="pvMask" @change="onDateChange">
          <picker-view-column><view v-for="(d, i) in days" :key="i" class="pv-item">{{ d.md }} {{ d.wk }}</view></picker-view-column>
          <picker-view-column><view v-for="h in hours" :key="h" class="pv-item">{{ h }}</view></picker-view-column>
          <picker-view-column><view v-for="m in minutes" :key="m" class="pv-item">{{ m }}</view></picker-view-column>
        </picker-view>
      </view>
    </view>

    <!-- 人数上限 -->
    <view v-if="capOpen" class="ov">
      <view class="mask" @tap="capOpen = false" @touchmove.stop.prevent="noop"></view>
      <view class="sheet">
        <view class="grab"></view>
        <view class="sh-bar">
          <text class="sh-btn" @tap="capOpen = false">取消</text>
          <text class="sh-title">人数上限</text>
          <text class="sh-btn sh-ok" @tap="confirmCap">确定</text>
        </view>
        <picker-view class="pv" :value="capVal" indicator-class="pv-ind" :mask-style="pvMask" @change="onCapChange">
          <picker-view-column><view v-for="n in caps" :key="n" class="pv-item">{{ n }} 人</view></picker-view-column>
        </picker-view>
        <text class="sh-hint">{{ capHint }}</text>
      </view>
    </view>

    <!-- 驻场荷官：从工作台的荷官名册里添加，只作信息展示 -->
    <view v-if="dealersOpen" class="ov">
      <view class="mask" @tap="dealersOpen = false" @touchmove.stop.prevent="noop"></view>
      <view class="sheet sheet-pro">
        <view class="grab"></view>
        <view class="sh-head"><text class="sh-title">驻场荷官</text><text class="sh-sub">已选 {{ form.dealers.length }} 位</text></view>
        <scroll-view scroll-y class="pro-scroll">
          <view v-for="d in dealerList" :key="d.id" class="dlr" :class="{ 'dlr-on': form.dealers.includes(d.id) }" hover-class="press-soft" @tap="toggleDealer(d)">
            <view class="dlr-av" :style="'background:' + d.bg + ';color:' + d.fg"><image v-if="d.photo" class="dlr-img" :src="d.photo" mode="aspectFill" /><text v-else>{{ d.char }}</text></view>
            <view class="dlr-main">
              <view class="dlr-top"><text class="dlr-n">{{ d.name }}</text><text class="dlr-title">{{ d.title }}</text></view>
              <text class="dlr-s">从业 {{ d.years }} 年 · {{ d.tags.join(' / ') }}</text>
            </view>
            <view class="chk" :class="{ 'chk-on': form.dealers.includes(d.id) }"><z-icon v-if="form.dealers.includes(d.id)" name="check" :size="13" :stroke="3" color="#FFFFFF" /></view>
          </view>
        </scroll-view>
        <text class="sh-hint">荷官只作信息展示，不关联账号，也没有控场操作</text>
        <view class="sh-done" hover-class="press" @tap="dealersOpen = false"><text class="sh-done-t">完成</text></view>
      </view>
    </view>

    <!-- 盲注结构：给某一级写说明（比赛邀请页点这一级时弹出）；不写就用平台预设 -->
    <view v-if="noteEdit.open" class="ov ov-note">
      <view class="mask" @tap="noteEdit.open = false" @touchmove.stop.prevent="noop"></view>
      <view class="note-card">
        <text class="note-t">{{ noteEdit.title }} · 说明</text>
        <text class="note-s">玩家在比赛邀请页点这一级时会看到。{{ noteEdit.preset ? '不写就用平台预设：' : '' }}</text>
        <text v-if="noteEdit.preset" class="note-preset">{{ noteEdit.preset }}</text>
        <textarea v-model="noteEdit.text" class="note-in" maxlength="80" :placeholder="noteEdit.preset ? '写下这一级在你的比赛里的安排（选填）' : '写下这一级的作用，比如：进入决赛桌'" placeholder-class="ph" />
        <text class="note-count">{{ noteEdit.text.length }}/80</text>
        <view class="note-acts">
          <view class="note-btn" hover-class="press" @tap="clearNote"><text class="note-btn-t">{{ noteEdit.preset ? '用平台预设' : '不写说明' }}</text></view>
          <view class="note-btn note-ok" hover-class="press" @tap="saveNote"><text class="note-btn-t">保存</text></view>
        </view>
      </view>
    </view>

    <!-- 比赛方案（中央悬浮窗） -->
    <view v-if="tplOpen" class="ov">
      <view class="mask" @tap="tplOpen = false" @touchmove.stop.prevent="noop"></view>
      <view class="md">
        <view class="md-head">
          <text class="sh-title">比赛方案</text>
          <text class="sh-sub md-sub">{{ templates.length }}/{{ maxSlots }}</text>
          <view class="md-close" hover-class="press" @tap="tplOpen = false"><z-icon name="x" :size="16" color="#9CA3AF" /></view>
        </view>
        <scroll-view scroll-y class="tiles-scroll" :class="{ 'tiles-scroll-host': isHost }"><view class="tiles">
          <view v-for="t in templateTiles" :key="t.id" class="tile tpl" hover-class="press-soft" @tap="applyTemplate(t.id)" @longpress="templateActions(t)">
            <view class="tpl-cover" :style="t.bg"></view>
            <text class="tpl-name">{{ t.name }}</text>
            <text class="tpl-meta">{{ t.meta }}</text>
          </view>
          <view v-if="templates.length < maxSlots" class="tile tpl tile-new" hover-class="press" @tap="saveTemplate">
            <z-icon name="plus" :size="22" color="#FF4D4D" />
            <text class="tile-new-t">{{ isHost ? '另存为新模板' : '存为方案' }}</text>
          </view>
          <view v-for="n in templateEmpty" :key="'t' + n" class="tile tpl tile-empty"></view>
        </view></scroll-view>
        <text class="sh-hint">点方案一键填好这张表（日期除外），长按可以删除</text>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, reactive, computed, nextTick, getCurrentInstance } from 'vue'
import { onLoad, onUnload } from '@dcloudio/uni-app'
import ZIcon from '@/components/z-icon/z-icon.vue'
import ZPop from '@/components/z-pop/z-pop.vue'
import { getAuth } from '@/common/auth.js'
import { getNavMetrics, goBackOrHome } from '@/common/nav.js'
import { svgUri, coverStyle } from '@/common/svg.js'
import { loadList, saveList, saveMatch, newRoomCode } from '@/common/store.js'
import { useCertState } from '@/common/cert.js'
import { listDevices, isOnline } from '@/common/devices.js'
import { listDealers, dealerSnapshot } from '@/common/dealers.js'
import { TV_THEMES } from '@/mock/remote.js'
import { SLOTS, INTRO_MAX, TAG_PRESETS, MAX_TAGS, TAG_MAX_LEN } from '@/mock/pro.js'
import { tagOf, newTag, tagStatus, tagProblem, TAG_REVIEW_MS } from '@/common/tags.js'
import { specialOf, NOTE_PRESETS } from '@/common/blind-notes.js'
import { me, coverScenes, blindSchemeSeeds, coHostSeeds, createDraft, matchTemplateSeeds, VENUES } from '@/mock/data.js'

const KEY_SCHEMES = 'zz_blind_schemes'
const KEY_TEMPLATES = 'zz_match_templates'

const nav = getNavMetrics()
const navStyle = `padding-top:${nav.statusBar}px;height:${nav.statusBar + nav.navH}px;padding-right:${nav.capsuleW}px;padding-left:${nav.capsuleW}px`
const edStyle = `top:${nav.statusBar + nav.navH + 8}px`
const backStyle = `top:${nav.statusBar + Math.max(0, (nav.navH - 36) / 2)}px`

const p2 = (n) => (n < 10 ? '0' : '') + n
const clone = (o) => JSON.parse(JSON.stringify(o))
const toast = (title) => uni.showToast({ title, icon: 'none' })
const buzz = (type = 'light') => { try { uni.vibrateShort({ type }) } catch (e) {} }
const instance = getCurrentInstance()
const pop = reactive({ show: false, text: '', icon: 'check', tone: 'red' })
let popTimer = null
function popMsg(text, icon = 'check', tone = 'red', ms = 2400) {
  clearTimeout(popTimer)
  Object.assign(pop, { show: true, text, icon, tone })
  popTimer = setTimeout(() => { pop.show = false }, ms)
}
const noop = () => {}

/* ---------- 封面 ---------- */

/* ---------- 日期与人数的滚轮数据 ---------- */
const WEEK = '日一二三四五六'
const today = new Date()
today.setHours(0, 0, 0, 0)
const days = Array.from({ length: 30 }, (_, i) => {
  const d = new Date(today)
  d.setDate(today.getDate() + i)
  return { md: `${p2(d.getMonth() + 1)}/${p2(d.getDate())}`, wk: i === 0 ? '今天' : i === 1 ? '明天' : '周' + WEEK[d.getDay()] }
})
const hours = Array.from({ length: 24 }, (_, i) => p2(i))
const minutes = Array.from({ length: 12 }, (_, i) => p2(i * 5))
const caps = Array.from({ length: 98 }, (_, i) => i + 2)
const nextFriday = (5 - today.getDay() + 7) % 7 || 7
const pvMask = 'background-image:linear-gradient(180deg,rgba(38,42,52,.96),rgba(38,42,52,.5)),linear-gradient(0deg,rgba(38,42,52,.96),rgba(38,42,52,.5));'

/* ---------- 表单状态 ---------- */
// 主办方（认证后）：方案存档 12 个、介绍 1000 字，并且有专业赛制配置
const certState = useCertState()
const isHost = computed(() => certState.value === 'verified')
const maxSlots = computed(() => (isHost.value ? SLOTS.host : SLOTS.user))
const proDefaults = () => ({ tags: [], tvTheme: { key: 'flip' }, screens: [], dealers: [], rules: [] })
const schemes = ref(loadList(KEY_SCHEMES, blindSchemeSeeds))
const templates = ref(loadList(KEY_TEMPLATES, matchTemplateSeeds))
const form = reactive({ ...clone(createDraft), ...proDefaults(), dayIdx: nextFriday, blindId: schemes.value.length ? schemes.value[0].id : '', coverImage: '' })
const hosts = ref(clone(coHostSeeds))

const picker = ref(false)
const editor = ref(false)
const dateOpen = ref(false)
const capOpen = ref(false)
const tplOpen = ref(false)
// 从主办方工作台直达：?open=blinds 打开盲注结构，?open=schemes 打开比赛方案（等页面进场动画结束再打开）
onLoad((q) => {
  if (q && q.open === 'blinds') setTimeout(() => { picker.value = true }, 350)
  if (q && q.open === 'schemes') setTimeout(() => { tplOpen.value = true }, 350)
  if (isHost.value) loadDevices()
})
const overlayOpen = computed(() => picker.value || editor.value || dateOpen.value || capOpen.value || tplOpen.value || dealersOpen.value || noteEdit.open)

const coverInfo = computed(() => coverScenes.find((c) => c.key === form.cover) || coverScenes[0])
function pickScene(key) {
  form.cover = key
  form.coverImage = ''
}
function uploadCover() {
  uni.chooseImage({
    count: 1,
    sizeType: ['compressed'],
    success: (res) => { form.coverImage = res.tempFilePaths[0] },
    fail: (err) => { if (!/cancel/.test((err && err.errMsg) || '')) toast('没能打开相册') }
  })
}

const dateText = computed(() => {
  const d = days[form.dayIdx] || days[0]
  return { day: `${d.md} ${d.wk}`, time: `${p2(form.hour)}:${p2(form.minute)}` }
})
const dateVal = ref([0, 0, 0])
function openDate() {
  dateVal.value = [form.dayIdx, form.hour, Math.round(form.minute / 5)]
  dateOpen.value = true
}
function onDateChange(e) { dateVal.value = e.detail.value }
function confirmDate() {
  const [d, h, m] = dateVal.value
  form.dayIdx = d
  form.hour = h
  form.minute = m * 5
  dateOpen.value = false
}
const capVal = ref([0])
const capHint = computed(() => `约 ${Math.ceil(caps[capVal.value[0]] / 9)} 桌，每桌 9 人`)
function openCap() {
  capVal.value = [Math.max(0, form.cap - 2)]
  capOpen.value = true
}
function onCapChange(e) { capVal.value = e.detail.value }
function confirmCap() {
  form.cap = caps[capVal.value[0]]
  capOpen.value = false
}

/* ---------- 地点：位置授权 + 地图选点 ---------- */
// 授权状态：true 已允许；false 之前拒绝过（系统不会再弹窗，只能引导去设置页）；undefined 还没问过
function ensureLocationAuth() {
  return new Promise((resolve) => {
    uni.getSetting({
      success: ({ authSetting }) => {
        const state = authSetting['scope.userLocation']
        if (state === true) return resolve(true)
        if (state === false) return guideToSettings(resolve)
        uni.authorize({ scope: 'scope.userLocation', success: () => resolve(true), fail: () => guideToSettings(resolve) })
      },
      fail: () => resolve(false)
    })
  })
}
function guideToSettings(resolve) {
  uni.showModal({
    title: '需要位置权限',
    content: '允许后，地图会先定位到你附近，方便选择比赛地点。不授权也可以直接在地图上搜索。',
    confirmText: '去设置',
    cancelText: '直接选择',
    success: ({ confirm }) => {
      if (!confirm) return resolve(false)
      uni.openSetting({ success: ({ authSetting }) => resolve(!!authSetting['scope.userLocation']), fail: () => resolve(false) })
    },
    fail: () => resolve(false)
  })
}
function openMapPicker() {
  const cur = form.location
  uni.chooseLocation({
    ...(cur ? { latitude: cur.latitude, longitude: cur.longitude } : {}),
    success: (res) => {
      if (!res.name && !res.address) return
      form.location = { name: res.name || res.address, address: res.address || '', latitude: res.latitude, longitude: res.longitude }
    },
    fail: (err) => {
      const msg = (err && err.errMsg) || ''
      if (/cancel/.test(msg)) return
      if (/privacy|auth deny|authorize/i.test(msg)) return toast('需要先同意隐私保护指引和位置权限')
      toast('没能打开地图')
    }
  })
}
function pickLocation() {
  // #ifdef MP-WEIXIN
  // 不论是否授权都打开地图：授权后地图定位到附近，没授权也能手动搜索
  ensureLocationAuth().then(openMapPicker)
  // #endif
  // #ifndef MP-WEIXIN
  // H5 预览没有接地图服务，用示例地点代替
  const list = Object.values(VENUES)
  uni.showActionSheet({ itemList: list.map((v) => v.name), success: ({ tapIndex }) => { form.location = clone(list[tapIndex]) } })
  // #endif
}

/* ---------- 共同主持 ---------- */
const hostSummary = computed(() => {
  const n = hosts.value.length
  const wait = hosts.value.filter((h) => h.status === 'pending').length
  return n ? `已邀请 ${n} 人${wait ? `，${wait} 人待接受` : ''}` : '还没有邀请共同主持'
})
function removeHost(h) {
  hosts.value = hosts.value.filter((x) => x.id !== h.id)
  toast(h.status === 'pending' ? `已撤回对${h.name}的邀请` : `已移除${h.name}`)
}

/* ---------- 盲注方案 ---------- */
const levelsOf = (rows) => rows.filter((r) => r.t === 'L')
const fmtNum = (n) => (n >= 10000 ? n / 10000 + '万' : String(n))
const startOf = (rows) => {
  const f = levelsOf(rows)[0]
  return f ? [fmtNum(f.sb), fmtNum(f.bb)] : ['—', '—']
}
const schemeById = (id) => schemes.value.find((s) => s.id === id)
const currentScheme = computed(() => schemeById(form.blindId))
const blindSummary = computed(() =>
  currentScheme.value ? `${levelsOf(currentScheme.value.rows).length} 级，${startOf(currentScheme.value.rows).join('/')} 起` : '选择或新建方案')
const schemeTiles = computed(() => schemes.value.map((s) => ({
  id: s.id, name: s.name, start: startOf(s.rows), count: levelsOf(s.rows).length, on: s.id === form.blindId
})))
const schemeEmpty = computed(() => Math.max(0, maxSlots.value - schemes.value.length - 1))
const persistSchemes = () => saveList(KEY_SCHEMES, schemes.value)

function chooseScheme(id) {
  form.blindId = id
  picker.value = false
}
function schemeActions(t) {
  uni.showActionSheet({
    itemList: t.on ? ['编辑'] : ['编辑', '删除'],
    success: ({ tapIndex }) => {
      if (tapIndex === 0) return openEditor(t.id)
      schemes.value = schemes.value.filter((s) => s.id !== t.id)
      persistSchemes()
      toast(`已删除${t.name}`)
    }
  })
}

/* ---------- 盲注编辑 ---------- */
const NUM = ['一', '二', '三', '四', '五']
const cellKeys = ['sb', 'bb', 'ante', 'min']
let rowKey = 1
const draft = reactive({ id: '', name: '', rows: [] })
const edAnchor = ref('')
const focusCell = ref('')
const levelNo = computed(() => {
  let n = 0
  return draft.rows.map((r) => (r.t === 'L' ? ++n : 0))
})
const draftLevels = computed(() => levelsOf(draft.rows).length)

function openEditor(id) {
  const src = id ? schemes.value.find((s) => s.id === id) : null
  if (!src && schemes.value.length >= maxSlots.value) return toast(`最多保存 ${maxSlots.value} 个方案，先长按删除一个`)
  const used = schemes.value.map((s) => s.name)
  const seed = [{ t: 'L', sb: 50, bb: 100, ante: 0, min: 20 }, { t: 'L', sb: 100, bb: 200, ante: 25, min: 20 }, { t: 'L', sb: 150, bb: 300, ante: 25, min: 20 }]
  draft.id = src ? src.id : ''
  draft.name = src ? src.name : '方案' + (NUM.find((c) => !used.includes('方案' + c)) || '')
  draft.rows = (src ? clone(src.rows) : seed).map((r) => ({ ...r, k: rowKey++ }))
  edAnchor.value = ''
  focusCell.value = ''
  picker.value = false
  editor.value = true
}
function setCell(i, key, e) {
  const v = parseInt(String(e.detail.value).replace(/\D/g, ''), 10)
  draft.rows[i][key] = isNaN(v) ? 0 : v
}
const nice = (x) => {
  const step = x < 100 ? 5 : x < 1000 ? 25 : x < 10000 ? 100 : 1000
  return Math.max(step, Math.round(x / step) * step)
}
function addRow(type) {
  if (type === 'C' && draft.rows.some((r) => r.t === 'C')) return toast('一个方案只能有一个截止买入')
  let row
  if (type === 'L') {
    const levels = levelsOf(draft.rows)
    const p = levels[levels.length - 1] || { sb: 50, bb: 100, ante: 0, min: 20 }
    const sb = nice(p.sb * 1.5)
    row = { t: 'L', sb, bb: sb * 2, ante: p.ante ? nice(p.ante * 1.5) : 0, min: p.min }
  } else if (type === 'B') {
    row = { t: 'B', min: 15 }
  } else {
    row = { t: 'C' }
  }
  row.k = rowKey++
  draft.rows.push(row)
  nextTick(() => { edAnchor.value = 'r' + row.k })
}
function saveScheme() {
  const levels = levelsOf(draft.rows)
  if (!levels.length) return toast('至少要有一个级别')
  if (levels.some((r) => !r.bb || r.sb > r.bb)) return toast('大盲要大于等于小盲')
  const name = draft.name.trim() || '未命名方案'
  const rows = draft.rows.map((r) => {
    const o = { ...r }
    delete o.k
    return o
  })
  if (draft.id) {
    schemes.value = schemes.value.map((s) => (s.id === draft.id ? { ...s, name, rows } : s))
  } else {
    draft.id = 'b' + Date.now()
    schemes.value = schemes.value.concat([{ id: draft.id, name, rows }])
  }
  form.blindId = draft.id
  persistSchemes()
  editor.value = false
  toast(`已保存${name}`)
}

/* ---------- 比赛方案（整场设置模板） ---------- */
const templateTiles = computed(() => templates.value.map((t) => {
  const s = schemeById(t.data.blindId)
  return { id: t.id, name: t.name, bg: coverStyle(t.data.cover, 'wide'), meta: `${s ? s.name : '盲注已删除'}，${t.data.cap} 人` }
}))
const templateEmpty = computed(() => Math.max(0, maxSlots.value - templates.value.length - 1))
const persistTemplates = () => saveList(KEY_TEMPLATES, templates.value)

function applyTemplate(id) {
  const t = templates.value.find((x) => x.id === id)
  if (!t) return
  Object.assign(form, proDefaults(), clone(t.data), { coverImage: '' })
  form.tags = (form.tags || []).map(tagOf)
  watchReview()
  if (!schemeById(form.blindId)) form.blindId = schemes.value.length ? schemes.value[0].id : ''
  hosts.value = clone(t.hosts || [])
  tplOpen.value = false
  toast(`已套用${t.name}`)
}
function saveTemplate() {
  if (templates.value.length >= maxSlots.value) return toast(`最多保存 ${maxSlots.value} 个方案`)
  const data = clone({
    cover: form.cover, name: form.name, blindId: form.blindId, hour: form.hour, minute: form.minute,
    cap: form.cap, intro: form.intro, isPublic: form.isPublic, autoApprove: form.autoApprove, location: form.location,
    // 主办方的方案连专业配置一起存
    ...(isHost.value ? { tags: form.tags, tvTheme: form.tvTheme, screens: form.screens, dealers: form.dealers, rules: form.rules } : {})
  })
  const name = form.name.trim() || '未命名比赛'
  templates.value = templates.value.concat([{ id: 't' + Date.now(), name, data, hosts: clone(hosts.value) }])
  persistTemplates()
  toast(isHost.value ? `已另存为新模板「${name}」` : `已存为方案「${name}」`)
}
function templateActions(t) {
  uni.showActionSheet({
    itemList: ['删除'],
    success: () => {
      templates.value = templates.value.filter((x) => x.id !== t.id)
      persistTemplates()
      toast(`已删除${t.name}`)
    }
  })
}

/* ---------- 主办方专属 ---------- */
const dealersOpen = ref(false)
const devices = ref([])
const loadedDevices = ref(false)
const dealerList = ref(listDealers())
async function loadDevices() {
  devices.value = await listDevices()
  loadedDevices.value = true
}
const toDevices = () => uni.navigateTo({ url: '/pages/devices/index' })
function toggleList(list, id) {
  const i = list.indexOf(id)
  if (i >= 0) list.splice(i, 1)
  else list.push(id)
}
// 现场大屏：一行 5 台（每台占 20% 宽），第一行以外的折叠起来；折叠时提示里面有几台已选
const PER_ROW = 5
const screensMore = ref(false)
const shownDevices = computed(() => (screensMore.value ? devices.value : devices.value.slice(0, PER_ROW)))
const hiddenPicked = computed(() => devices.value.slice(PER_ROW).filter((d) => form.screens.includes(d.id)).length)
const toggleScreen = (d) => toggleList(form.screens, d.id)
// TV 主题：封面是大屏效果图
const theme = computed(() => TV_THEMES.find((t) => t.key === form.tvTheme.key) || TV_THEMES[0])
const themeName = computed(() => theme.value.name)
// 驻场荷官
const toggleDealer = (d) => toggleList(form.dealers, d.id)
const dealerPicked = computed(() => form.dealers.map((id) => dealerList.value.find((d) => d.id === id)).filter(Boolean))
// 比赛标签：预设 + 自定义，选中的排在前面
const tagInput = ref(false)
const tagDraft = ref('')
// 审核中的标签：每秒刷新一次状态，审核完自动变成已通过
const nowTick = ref(Date.now())
let reviewTimer = null
onUnload(() => clearInterval(reviewTimer))
function watchReview() {
  clearInterval(reviewTimer)
  if (!form.tags.some((t) => tagStatus(t) === 'pending')) return
  reviewTimer = setInterval(() => {
    nowTick.value = Date.now()
    if (!form.tags.some((t) => tagStatus(t, nowTick.value) === 'pending')) {
      clearInterval(reviewTimer)
      toast('自定义标签已通过审核')
    }
  }, 1000)
}
// 标签：选中的（带审核状态）排在前面，后面是没选的预设
const tagChips = computed(() => {
  const now = nowTick.value
  const picked = form.tags.map(tagOf).map((t) => ({ text: t.text, on: true, state: tagStatus(t, now) }))
  const rest = TAG_PRESETS.filter((p) => !picked.some((t) => t.text === p)).map((p) => ({ text: p, on: false, state: 'approved' }))
  return picked.concat(rest)
})
function toggleTag(t) {
  const i = form.tags.findIndex((x) => tagOf(x).text === t.text)
  if (i >= 0) return form.tags.splice(i, 1)
  if (form.tags.length >= MAX_TAGS) return toast(`最多 ${MAX_TAGS} 个标签`)
  form.tags.push(newTag(t.text))
}
function startTag() {
  if (form.tags.length >= MAX_TAGS) return toast(`最多 ${MAX_TAGS} 个标签`)
  tagDraft.value = ''
  tagInput.value = true
}
// 自定义标签：本地先检查（不通过的直接说明原因，不加入）；通过的进入审核
function commitTag() {
  if (!tagInput.value) return // 「完成」和失去焦点都会触发，只处理一次
  tagInput.value = false
  const t = tagDraft.value.trim()
  tagDraft.value = ''
  if (!t) return
  if (form.tags.some((x) => tagOf(x).text === t)) return toast('已经有这个标签了')
  if (form.tags.length >= MAX_TAGS) return toast(`最多 ${MAX_TAGS} 个标签`)
  const problem = tagProblem(t)
  if (problem) return uni.showModal({ title: `「${t}」没有通过审核`, content: problem + '，换一个说法试试。', showCancel: false, confirmText: '知道了' })
  form.tags.push(newTag(t))
  if (!TAG_PRESETS.includes(t)) {
    toast(`「${t}」已提交审核，约 ${Math.round(TAG_REVIEW_MS / 1000)} 秒`)
    watchReview()
  }
}
// 介绍与规程：介绍和各段落合计不超过上限（主办方 1000 字）；每个输入框的上限 = 自己现有的字数 + 还剩的字数
const introMax = computed(() => (isHost.value ? INTRO_MAX.host : INTRO_MAX.user))
const introUsed = computed(() => form.intro.length + (isHost.value ? form.rules.reduce((n, r) => n + r.title.length + r.body.length, 0) : 0))
const fieldMax = (text, cap = 1000) => Math.min(cap, text.length + Math.max(0, introMax.value - introUsed.value))
let ruleSeq = 1
const focusRule = ref('')
function addRule(level) {
  if (introMax.value - introUsed.value <= 0) return toast(`已经写满 ${introMax.value} 字了`)
  const id = 'r' + Date.now() + '-' + ruleSeq++
  form.rules.push({ id, level, title: '', body: '' })
  focusRule.value = ''
  nextTick(() => { focusRule.value = id })
}
function moveRule(i, step) {
  const [r] = form.rules.splice(i, 1)
  form.rules.splice(i + step, 0, r)
}
// 把当前盲注结构另存为一份新模板（复制一份到方案存档里），之后可以单独改
function saveSchemeAs() {
  const src = currentScheme.value
  if (!src) return
  if (schemes.value.length >= maxSlots.value) return toast(`最多保存 ${maxSlots.value} 个方案，先长按删除一个`)
  const used = schemes.value.map((s) => s.name)
  let name = src.name + ' 副本'
  for (let k = 2; used.includes(name); k++) name = src.name + ' 副本 ' + k
  const copy = { id: 'b' + Date.now(), name: name.slice(0, 8), rows: clone(src.rows).map(({ k, ...r }) => r) }
  schemes.value = schemes.value.concat([copy])
  persistSchemes()
  form.blindId = copy.id
  toast(`已另存为「${copy.name}」`)
}

/* ---------- 盲注结构：特殊级别的说明 ---------- */
// 休息、截止买入、前注开启的那一级有平台预设；主办方也可以给任意一级写说明，比赛邀请页点这一级时弹出
const noteEdit = reactive({ open: false, idx: -1, title: '', preset: '', text: '' })
const hasNote = (r) => !!String((r && r.note) || '').trim()
const noteMark = (i) => hasNote(draft.rows[i]) || !!specialOf(draft.rows, i)
function openNote(i) {
  const r = draft.rows[i]
  const sp = specialOf(draft.rows.map((x, k) => (k === i ? { ...x, note: '' } : x)), i)
  noteEdit.idx = i
  noteEdit.title = r.t === 'L' ? `第 ${levelNo.value[i]} 级${sp && sp.kind === 'ante' ? '（前注开启）' : ''}` : r.t === 'B' ? '休息' : '截止买入'
  noteEdit.preset = sp && sp.kind !== 'note' ? NOTE_PRESETS[sp.kind].text : ''
  noteEdit.text = String(r.note || '')
  noteEdit.open = true
}
function saveNote() {
  const r = draft.rows[noteEdit.idx]
  if (r) r.note = noteEdit.text.trim()
  noteEdit.open = false
}
function clearNote() {
  const r = draft.rows[noteEdit.idx]
  if (r) r.note = ''
  noteEdit.open = false
}

/* ---------- 盲注结构：按住左侧把手上下拖动调整顺序 ---------- */
// 行高固定 84rpx，拖动的距离除以行高就是目标位置；其他行让出位置；靠近列表上下边缘时自动滚动
const ROW_H = uni.upx2px(84)
const drag = reactive({ from: -1, to: -1, dy: 0 })
const edScrollTop = ref(0)
let edScrollNow = 0
let dragY0 = 0
let dragScroll0 = 0
let dragLastY = 0
let listBox = null
let autoTimer = null
let autoV = 0
function onEdScroll(e) { edScrollNow = (e && e.detail && e.detail.scrollTop) || 0 }
function dragStart(i, e) {
  const t = e.touches[0]
  drag.from = i
  drag.to = i
  drag.dy = 0
  dragY0 = dragLastY = t.clientY
  dragScroll0 = edScrollNow
  listBox = null
  uni.createSelectorQuery().in(instance && instance.proxy).select('.ed-list').boundingClientRect((r) => { listBox = r }).exec()
  buzz()
}
function updateDrag() {
  if (drag.from < 0) return
  drag.dy = dragLastY - dragY0 + (edScrollNow - dragScroll0)
  const to = Math.max(0, Math.min(draft.rows.length - 1, drag.from + Math.round(drag.dy / ROW_H)))
  if (to !== drag.to) { drag.to = to; buzz() }
}
function dragMove(e) {
  if (drag.from < 0) return
  dragLastY = e.touches[0].clientY
  updateDrag()
  // 手指靠近列表上下边缘：自动滚动，长的盲注表也能拖到头
  const edge = 44
  autoV = !listBox ? 0 : dragLastY < listBox.top + edge ? -8 : dragLastY > listBox.bottom - edge ? 8 : 0
  if (autoV && !autoTimer) {
    autoTimer = setInterval(() => {
      const max = Math.max(0, draft.rows.length * ROW_H - (listBox ? listBox.height : 0))
      const next = Math.max(0, Math.min(max, edScrollNow + autoV))
      if (next === edScrollNow) return
      edScrollNow = next
      edScrollTop.value = next
      updateDrag()
    }, 16)
  } else if (!autoV) stopAuto()
}
function stopAuto() {
  clearInterval(autoTimer)
  autoTimer = null
}
function rowStyle(i) {
  if (drag.from < 0) return ''
  const { from, to } = drag
  if (i === from) return `transform:translateY(${drag.dy.toFixed(1)}px) scale(1.02);z-index:5`
  if (from < to && i > from && i <= to) return `transform:translateY(${-ROW_H}px)`
  if (from > to && i >= to && i < from) return `transform:translateY(${ROW_H}px)`
  return ''
}
function dragEnd() {
  if (drag.from < 0) return
  stopAuto()
  const { from, to } = drag
  drag.from = -1
  drag.to = -1
  drag.dy = 0
  if (from === to) return
  const rows = draft.rows.slice()
  const [moved] = rows.splice(from, 1)
  rows.splice(to, 0, moved)
  // 比赛从第一级开始：休息和截止买入不能排在最前面
  if (rows[0].t !== 'L') return toast('第一行要是级别，休息和截止买入不能放在最前面')
  draft.rows.splice(0, draft.rows.length, ...rows)
  buzz('medium')
}

/* ---------- 发布 ---------- */
// 比赛 id 在进入页面时就生成，分享路径和发布记录用同一个 id
const matchId = 'm' + Date.now()
function buildMatch() {
  const start = new Date(today)
  start.setDate(today.getDate() + form.dayIdx)
  start.setHours(form.hour, form.minute, 0, 0)
  const meP = { name: me.nickname, c: me.char, bg: '#F1E4D3', fg: '#8A1C1C' }
  return {
    id: matchId,
    cover: form.cover,
    coverImage: form.coverImage,
    name: form.name.trim(),
    blindName: currentScheme.value.name,
    blindRows: clone(currentScheme.value.rows),
    startAt: start.getTime(),
    cap: form.cap,
    intro: form.intro.trim(),
    isPublic: form.isPublic,
    autoApprove: form.autoApprove,
    location: form.location ? clone(form.location) : null,
    inviter: meP,
    hosts: [{ ...meP, role: 'owner' }].concat(hosts.value.filter((h) => h.status === 'joined')
      .map((h) => ({ name: h.name, c: h.c, bg: h.bg, fg: h.fg, role: 'cohost' }))),
    participants: [meP],
    createdAt: Date.now(),
    // 创建者的身份：广场上主办方创建的比赛带 V 标识
    creatorRole: isHost.value ? 'host' : 'player',
    creator: { name: me.nickname, char: me.char, bg: '#F1E4D3', fg: '#8A1C1C', role: isHost.value ? 'host' : 'player' },
    // 主办方专业配置：标签、TV 主题和信息、现场大屏、驻场荷官（快照）、规程段落
    ...(isHost.value ? {
      tags: form.tags.map(tagOf),
      tvTheme: clone(form.tvTheme),
      screens: form.screens.slice(),
      dealers: dealerPicked.value.map(dealerSnapshot),
      rules: form.rules.filter((r) => r.title.trim() || r.body.trim()).map((r) => ({ level: r.level, title: r.title.trim(), body: r.body.trim() }))
    } : {})
  }
}
const publishing = ref(false)
// 去发布：校验通过后创建比赛，生成 6 位房间码并提示，再无缝跳到比赛邀请页（用 redirectTo，返回时不会回到已发布的表单）。
// 分享统一在比赛邀请页做，这一页不再提供分享
function onPublish() {
  if (publishing.value) return
  if (!form.name.trim()) return toast('先给比赛起个名字')
  if (!currentScheme.value) return toast('先选一个盲注方案')
  if (!form.location) return toast('先选择比赛地点')
  publishing.value = true
  const match = buildMatch()
  match.roomCode = newRoomCode()
  match.ownerId = (getAuth() || {}).userId || me.id
  saveMatch(match)
  buzz('medium')
  popMsg(`发布成功 · 房间码 ${match.roomCode.slice(0, 3)} ${match.roomCode.slice(3)}`, 'check', 'red', 1600)
  setTimeout(() => uni.redirectTo({ url: `/pages/invite/index?id=${match.id}&created=1` }), 1100)
}
</script>

<style>
.page { min-height: 100vh; background: #181A20; padding-bottom: calc(200rpx + env(safe-area-inset-bottom)); }
.press { opacity: .82; transform: scale(.97); }
.press-soft { opacity: .88; }
.ph { color: #6B7280; }

/* 导航 */
.nav { position: relative; display: flex; align-items: center; justify-content: center; box-sizing: border-box; }
.back {
  position: absolute; left: 32rpx; width: 72rpx; height: 72rpx;
  border-radius: 50%; background: #262A34; display: flex; align-items: center; justify-content: center;
}
.nav-title { font-family: "ZZDisplay", "PingFang SC", sans-serif; font-size: 42rpx; letter-spacing: 2rpx; color: #FFFFFF; }

.body { padding: 16rpx 32rpx 0; }
.lb { display: block; font-size: 26rpx; font-weight: 500; line-height: 32rpx; color: #9CA3AF; }
.lb-gap { margin-top: 36rpx; }
.fd { background: #1F222A; border-radius: 24rpx; }
.count { font-size: 22rpx; color: #6B7280; }

/* 封面 */
.cv { position: relative; margin-top: 16rpx; height: 236rpx; border-radius: 32rpx; overflow: hidden; background: #1F222A; }
.cv-fill { position: absolute; left: 0; top: 0; width: 100%; height: 100%; }
.cv-art { background-size: cover; background-position: center; }
.cv-cap { margin-top: 16rpx; display: flex; align-items: baseline; }
.cv-name { font-size: 26rpx; font-weight: 500; color: #FFFFFF; }
.cv-line { margin-left: 16rpx; font-size: 24rpx; color: #9CA3AF; }
.strip { margin: 16rpx -32rpx 0; padding: 12rpx 32rpx 14rpx; display: flex; overflow-x: auto; }
.strip::-webkit-scrollbar { display: none; }
.th {
  position: relative; flex: none; width: 100rpx; height: 80rpx; margin-right: 20rpx; border-radius: 16rpx; box-sizing: border-box;
  background-size: cover; background-position: center; background-color: #262A34;
}
.th-on { box-shadow: 0 0 0 4rpx #181A20, 0 0 0 8rpx #DC0000; }
.th-ck {
  position: absolute; top: -14rpx; right: -14rpx; width: 32rpx; height: 32rpx; box-sizing: border-box;
  border-radius: 50%; background: #DC0000; border: 4rpx solid #181A20; display: flex; align-items: center; justify-content: center;
}
.th-up { border: 3rpx dashed #3A3D46; display: flex; align-items: center; justify-content: center; }

/* 名称 */
.name { margin-top: 16rpx; height: 92rpx; display: flex; align-items: center; padding: 0 28rpx; }
.name-input { flex: 1; height: 92rpx; font-size: 30rpx; color: #FFFFFF; }

/* 三列 */
.row3 { display: flex; margin-top: 32rpx; }
.col-blind { flex: 1.25; min-width: 0; }
.col-date { flex: 1; min-width: 0; margin-left: 16rpx; }
.col-cap { width: 128rpx; flex: none; margin-left: 16rpx; }
.field { margin-top: 16rpx; height: 108rpx; box-sizing: border-box; padding: 0 16rpx 0 24rpx; display: flex; align-items: center; justify-content: space-between; }
.field-main { min-width: 0; display: flex; flex-direction: column; }
.field-col { flex-direction: column; align-items: flex-start; justify-content: center; }
.field-v { font-size: 28rpx; font-weight: 500; color: #FFFFFF; white-space: nowrap; }
.field-s { margin-top: 4rpx; font-size: 22rpx; color: #9CA3AF; white-space: nowrap; }
.field-col .field-s { margin-top: 0; margin-bottom: 4rpx; }
.field-cap { justify-content: center; align-items: baseline; padding: 34rpx 0 0; }
.cap-v { font-size: 34rpx; font-weight: 500; color: #FFFFFF; }
.cap-u { margin-left: 4rpx; font-size: 22rpx; color: #9CA3AF; }

/* 地点 */
.loc { margin-top: 16rpx; padding: 22rpx 20rpx 22rpx 22rpx; display: flex; align-items: center; }
.loc-ic { width: 64rpx; height: 64rpx; flex: none; border-radius: 50%; background: #262A34; display: flex; align-items: center; justify-content: center; }
.loc-main { flex: 1; min-width: 0; margin: 0 16rpx 0 20rpx; display: flex; flex-direction: column; }
.loc-name { font-size: 28rpx; font-weight: 500; color: #FFFFFF; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.loc-ph { font-weight: 400; color: #6B7280; }
.loc-addr { margin-top: 6rpx; font-size: 24rpx; color: #9CA3AF; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

/* 介绍 */
.intro-box { position: relative; margin-top: 16rpx; height: 176rpx; padding: 20rpx 24rpx 40rpx; box-sizing: border-box; }
.intro { display: block; width: 100%; height: 116rpx; font-size: 26rpx; line-height: 1.6; color: #E5E7EB; }
.intro-static { overflow: hidden; }
.count-abs { position: absolute; right: 20rpx; bottom: 14rpx; }

/* 共同主持 */
.host-head { margin-top: 36rpx; display: flex; align-items: baseline; justify-content: space-between; }
.host-sum { font-size: 24rpx; color: #6B7280; }
.hosts { margin-top: 20rpx; white-space: nowrap; }
.hosts-row { display: flex; padding: 12rpx 12rpx 4rpx 4rpx; }
.host { width: 112rpx; flex: none; margin-right: 28rpx; display: flex; flex-direction: column; align-items: center; }
.host-av { position: relative; width: 88rpx; height: 88rpx; box-sizing: border-box; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 32rpx; font-weight: 500; }
.host-me { background: #F1E4D3; color: #8A1C1C; box-shadow: 0 0 0 4rpx #181A20, 0 0 0 8rpx #F4B740; }
.host-wait { background: #23262E; color: #6B7280; border: 3rpx dashed #FFC53A; }
.host-add { border: 3rpx dashed #3A3D46; }
.host-x {
  position: absolute; top: -10rpx; right: -10rpx; width: 40rpx; height: 40rpx; box-sizing: border-box;
  border-radius: 50%; background: #35383F; border: 4rpx solid #181A20; display: flex; align-items: center; justify-content: center;
}
.host-hg {
  position: absolute; right: -8rpx; bottom: -8rpx; width: 36rpx; height: 36rpx; box-sizing: border-box;
  border-radius: 50%; background: #FFC53A; border: 4rpx solid #181A20; display: flex; align-items: center; justify-content: center;
}
.host-n { margin-top: 16rpx; max-width: 112rpx; font-size: 22rpx; line-height: 28rpx; color: #E5E7EB; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.host-n-add { color: #9CA3AF; }
.host-s { font-size: 22rpx; line-height: 28rpx; color: #6B7280; }
.host-s-me { color: #F4B740; }
.host-s-wait { color: #FFC53A; }

/* 开关 */
.sw-row { margin-top: 36rpx; padding: 24rpx 28rpx; display: flex; align-items: center; }
.sw-text { flex: 1; min-width: 0; display: flex; flex-direction: column; }
.sw-title { font-size: 28rpx; font-weight: 500; color: #FFFFFF; }
.sw-sub { margin-top: 6rpx; font-size: 24rpx; color: #9CA3AF; }
.sw { position: relative; width: 96rpx; height: 56rpx; flex: none; margin-left: 24rpx; border-radius: 999rpx; background: #35383F; transition: background .2s ease; }
.sw-on { background: #DC0000; }
.sw-knob { position: absolute; top: 6rpx; left: 6rpx; width: 44rpx; height: 44rpx; border-radius: 50%; background: #FFFFFF; transition: transform .2s ease; }
.sw-on .sw-knob { transform: translateX(40rpx); }
.more { margin-top: 36rpx; display: flex; align-items: center; }
.more-line { flex: 1; height: 1px; margin-left: 20rpx; background: #2A2D36; }
.sw-row-tight { margin-top: 20rpx; }

/* 底部 */
.bar {
  position: fixed; z-index: 50; left: 0; right: 0; bottom: 0; display: flex;
  padding: 24rpx 32rpx calc(24rpx + env(safe-area-inset-bottom)); background: #181A20; border-top: 1px solid #24272F;
}
.bar-plan { width: 208rpx; height: 96rpx; border-radius: 999rpx; background: #35383F; display: flex; align-items: center; justify-content: center; }
.bar-plan-t { margin-left: 10rpx; font-size: 30rpx; font-weight: 500; color: #FFFFFF; }
.bar-pub {
  flex: 1; margin: 0 0 0 20rpx; padding: 0; height: 96rpx; line-height: normal; border-radius: 999rpx; background: #DC0000;
  box-shadow: 0 12rpx 36rpx rgba(220, 0, 0, .35); display: flex; align-items: center; justify-content: center;
}
.bar-pub::after { border: none; }
.bar-pub-t { margin-left: 10rpx; font-size: 32rpx; font-weight: 500; color: #FFFFFF; }
.bar-pub-busy { opacity: .85; }
.bar-spin { display: flex; animation: bar-spin .8s linear infinite; }
@keyframes bar-spin { to { transform: rotate(360deg); } }

/* 弹层通用 */
.ov { position: fixed; z-index: 100; left: 0; top: 0; right: 0; bottom: 0; }
.mask { position: absolute; left: 0; top: 0; right: 0; bottom: 0; background: rgba(0, 0, 0, .6); }
.sheet {
  position: absolute; left: 0; right: 0; bottom: 0; padding: 16rpx 32rpx calc(40rpx + env(safe-area-inset-bottom));
  background: #262A34; border-radius: 48rpx 48rpx 0 0; animation: ov-up .22s ease-out;
}
@keyframes ov-up { from { transform: translateY(100%); } to { transform: translateY(0); } }
.grab { width: 72rpx; height: 8rpx; margin: 0 auto 16rpx; border-radius: 4rpx; background: #4A4D57; }
.sh-head { display: flex; align-items: baseline; justify-content: space-between; margin-bottom: 20rpx; }
.sh-bar { display: flex; align-items: center; justify-content: space-between; height: 88rpx; }
.sh-title { font-size: 32rpx; font-weight: 500; color: #FFFFFF; }
.sh-sub { font-size: 24rpx; color: #9CA3AF; }
.sh-btn { padding: 16rpx 8rpx; font-size: 30rpx; color: #9CA3AF; }
.sh-ok { color: #FF4D4D; font-weight: 500; }
.sh-hint { display: block; margin-top: 24rpx; text-align: center; font-size: 24rpx; color: #9CA3AF; }

/* 介绍与规程 */
.lb-row { display: flex; align-items: baseline; justify-content: space-between; }
.count-full { color: #FF6B6B; }
.rule { margin-top: 16rpx; padding: 18rpx 20rpx 20rpx 24rpx; }
.rule-h1 { box-shadow: inset 6rpx 0 0 #DC0000; }
.rule-h2 { box-shadow: inset 6rpx 0 0 #4A4D57; margin-left: 32rpx; }
.rule-top { display: flex; align-items: center; }
.rule-lv { flex: none; height: 48rpx; padding: 0 16rpx; border-radius: 12rpx; background: #2A2D36; display: flex; align-items: center; font-size: 22rpx; color: #E5E7EB; }
.rule-h1 .rule-lv { background: #3A1418; color: #FF8A8A; }
.rule-title { flex: 1; min-width: 0; margin-left: 16rpx; height: 48rpx; font-size: 28rpx; font-weight: 600; color: #FFFFFF; }
.rule-h2 .rule-title { font-size: 26rpx; }
.rule-act { width: 48rpx; height: 48rpx; margin-left: 6rpx; flex: none; border-radius: 12rpx; display: flex; align-items: center; justify-content: center; }
.rule-body { display: block; width: 100%; min-height: 72rpx; margin-top: 12rpx; font-size: 26rpx; line-height: 1.6; color: #D1D5DB; }
.rule-body-static { white-space: pre-wrap; }
.rule-adds { margin-top: 16rpx; display: flex; }
.rule-add { height: 64rpx; margin-right: 16rpx; padding: 0 24rpx; border-radius: 999rpx; border: 2rpx dashed rgba(220, 0, 0, .5); display: flex; align-items: center; }
.rule-add-2 { border-color: #4A4D57; }
.rule-add-t { margin-left: 6rpx; font-size: 24rpx; color: #E5E7EB; }

/* 主办方专属 */
.pro-badge { margin-left: 12rpx; height: 36rpx; padding: 0 12rpx; border-radius: 999rpx; background: rgba(244, 183, 64, .14); display: flex; align-items: center; }
.pro-badge-t { margin-left: 4rpx; font-size: 20rpx; color: #F4B740; }
.lb-act { font-size: 24rpx; color: #FF6B6B; }
.lb-row-first { margin-top: 20rpx; }
.dav { position: relative; }
.dav-img { position: absolute; left: 0; top: 0; width: 100%; height: 100%; border-radius: 50%; }
.dav-title { color: #F4B740; }
.tags { margin-top: 16rpx; display: flex; flex-wrap: wrap; }
.tg { height: 60rpx; margin: 0 14rpx 14rpx 0; padding: 0 22rpx; border-radius: 999rpx; background: #1F222A; border: 2rpx solid transparent; display: flex; align-items: center; }
.tg-on { background: #2A1216; border-color: rgba(220, 0, 0, .55); }
.tg-t { margin-right: 6rpx; font-size: 24rpx; color: #E5E7EB; }
.tg-on .tg-t { color: #FFFFFF; }
.tg-add { border-style: dashed; border-color: #4A4D57; background: transparent; }
.tg-add-t { margin-left: 6rpx; margin-right: 0; color: #9CA3AF; }
.tg-input { width: 220rpx; border-color: #DC0000; }
.tg-in { width: 100%; height: 56rpx; font-size: 24rpx; color: #FFFFFF; }
.tg-pending { background: rgba(255, 197, 58, .08); border-color: rgba(255, 197, 58, .45); }
.tg-rejected { background: rgba(255, 107, 107, .08); border-color: rgba(255, 107, 107, .4); }
.tg-rejected .tg-t { text-decoration: line-through; color: #9CA3AF; }
.tg-st { margin-left: 4rpx; font-size: 20rpx; color: #FFC53A; }
.tg-st-bad { color: #FF6B6B; }
.tg-pending .tg-t { margin-left: 6rpx; }
/* 现场大屏：电视图标，一行 5 台，选中的亮起来 */
.tvis { margin-top: 12rpx; display: flex; flex-wrap: wrap; }
.tvi { width: 20%; padding: 12rpx 0 8rpx; box-sizing: border-box; display: flex; flex-direction: column; align-items: center; }
.tvi-ic { position: relative; width: 96rpx; height: 84rpx; border-radius: 22rpx; background: #1F222A; display: flex; align-items: center; justify-content: center; transition: background .2s ease, box-shadow .2s ease; }
.tvi-on .tvi-ic { background: #2A1216; box-shadow: inset 0 0 0 3rpx #DC0000, 0 0 24rpx rgba(220, 0, 0, .45); }
.tvi-dot { position: absolute; right: 12rpx; top: 10rpx; width: 12rpx; height: 12rpx; border-radius: 50%; background: #4B5060; }
.tvi-dot-on { background: #4CB582; }
.tvi-n { margin-top: 10rpx; max-width: 100%; font-size: 22rpx; color: #6B7280; white-space: nowrap; overflow: hidden; }
.tvi-on .tvi-n { color: #FFFFFF; }
.tvi-off .tvi-n { color: #4B5060; }
.tvi-more { margin-top: 4rpx; height: 56rpx; display: flex; align-items: center; justify-content: center; }
.tvi-more-t { margin-right: 6rpx; font-size: 22rpx; color: #9CA3AF; }
/* 房间 TV 主题：左边封面，右边竖排的主题列表 */
.tvt { margin-top: 16rpx; height: 244rpx; display: flex; }
.tvt-cover { width: 434rpx; height: 244rpx; flex: none; border-radius: 20rpx; overflow: hidden; background: #000000; box-shadow: inset 0 0 0 2rpx rgba(255, 255, 255, .12); }
.tvt-img { width: 100%; height: 100%; }
.tvt-list { flex: 1; min-width: 0; height: 244rpx; margin-left: 16rpx; }
.tvt-i { margin-bottom: 12rpx; padding: 8rpx; border-radius: 16rpx; background: #1F222A; display: flex; align-items: center; box-sizing: border-box; }
.tvt-on { background: #2A1216; box-shadow: inset 0 0 0 3rpx #DC0000; }
.tvt-thumb { width: 88rpx; height: 50rpx; flex: none; border-radius: 8rpx; }
.tvt-n { margin-left: 12rpx; flex: 1; min-width: 0; font-size: 24rpx; color: #E5E7EB; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.tvt-on .tvt-n { color: #FFFFFF; font-weight: 600; }
.add-box { margin-top: 16rpx; height: 104rpx; border: 2rpx dashed #3A3D46; display: flex; align-items: center; justify-content: center; }
.add-box-t { margin-left: 10rpx; font-size: 26rpx; color: #9CA3AF; }
.tg-hint { display: block; margin-top: 2rpx; font-size: 22rpx; color: #6B7280; }

/* 专业配置的弹层 */
.sheet-pro { max-height: 86vh; display: flex; flex-direction: column; }
.pro-scroll { max-height: 760rpx; }
.sh-sec { display: block; margin: 28rpx 0 12rpx; font-size: 24rpx; color: #9CA3AF; }
.sh-done { margin-top: 24rpx; height: 92rpx; border-radius: 999rpx; background: #DC0000; display: flex; align-items: center; justify-content: center; }
.sh-done-t { font-size: 30rpx; font-weight: 600; color: #FFFFFF; }
.pro-empty { padding: 40rpx 0; text-align: center; font-size: 26rpx; color: #9CA3AF; }
.lnk { color: #FF6B6B; }
.chk { width: 44rpx; height: 44rpx; flex: none; box-sizing: border-box; border-radius: 50%; border: 3rpx solid #4A4D57; display: flex; align-items: center; justify-content: center; }
.chk-on { border-color: #DC0000; background: #DC0000; }
.dlr { display: flex; align-items: center; padding: 18rpx 8rpx; border-bottom: 1rpx solid #2E313A; }
.dlr-av { width: 80rpx; height: 80rpx; flex: none; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 30rpx; font-weight: 700; }
.dlr-on .dlr-av { box-shadow: 0 0 0 4rpx #DC0000; }
.dlr-av { overflow: hidden; }
.dlr-img { width: 100%; height: 100%; }
.dlr-main { flex: 1; min-width: 0; margin: 0 16rpx 0 20rpx; }
.dlr-top { display: flex; align-items: baseline; }
.dlr-n { font-size: 28rpx; font-weight: 600; color: #FFFFFF; }
.dlr-title { margin-left: 12rpx; font-size: 22rpx; color: #F4B740; }
.dlr-s { display: block; margin-top: 6rpx; font-size: 22rpx; color: #9CA3AF; }

/* 12 格方案存档（3×4，多了就滚动） */
.tiles-scroll { max-height: none; }
.tiles-scroll-host { max-height: 760rpx; }
.saveas { margin-top: 16rpx; height: 72rpx; border-radius: 999rpx; border: 1rpx dashed rgba(220, 0, 0, .5); display: flex; align-items: center; justify-content: center; }
.saveas-t { margin-left: 8rpx; font-size: 24rpx; color: #FF8A8A; }

/* 方案卡片 */
.tiles { display: flex; flex-wrap: wrap; justify-content: center; }
.tile {
  position: relative; width: 208rpx; height: 184rpx; margin: 9rpx; padding: 20rpx; box-sizing: border-box;
  border-radius: 28rpx; background: #1F222A; display: flex; flex-direction: column; align-items: flex-start; justify-content: space-between;
}
.tile-on { background: #2A1216; box-shadow: 0 0 0 3rpx #DC0000; }
.tile-name { font-size: 26rpx; font-weight: 500; color: #FFFFFF; }
.tile-flaps { display: flex; align-items: center; }
.mf {
  position: relative; height: 36rpx; line-height: 36rpx; padding: 0 8rpx; border-radius: 4rpx; background: #0E0F12;
  font-family: "BoardNum", "DIN Alternate", sans-serif; font-weight: 800; font-size: 28rpx; color: #F2F2EE;
}
.mf-sl { margin: 0 6rpx; font-family: "BoardNum", sans-serif; font-weight: 700; font-size: 26rpx; color: #8F8F8A; }
.tile-meta { font-size: 22rpx; color: #9CA3AF; }
.tile-meta-on { color: #FF4D4D; }
.tile-new { align-items: center; justify-content: center; background: #2A1216; border: 2rpx dashed #7A2A2E; }
.tile-new-t { margin-top: 12rpx; font-size: 24rpx; color: #FF4D4D; }
.tile-empty { background: transparent; border: 2rpx dashed #3A3D46; }

/* 盲注编辑：单元格用比面板稍亮一档的灰，休息、截止只用低饱和的暖色和酒红 */
.ed {
  position: absolute; left: 20rpx; right: 20rpx; bottom: calc(40rpx + env(safe-area-inset-bottom));
  background: #1F222A; border: 1rpx solid #2A2D36; border-radius: 48rpx; display: flex; flex-direction: column; overflow: hidden;
  animation: ov-fade .2s ease-out;
}
@keyframes ov-fade { from { opacity: 0; transform: scale(.97); } to { opacity: 1; transform: scale(1); } }
.ed-head { display: flex; align-items: center; padding: 28rpx 24rpx 16rpx 28rpx; }
.ed-name { width: 220rpx; height: 60rpx; padding: 0 20rpx; border-radius: 999rpx; background: #262A34; font-size: 28rpx; font-weight: 500; color: #FFFFFF; }
.ed-count { margin-left: 16rpx; font-size: 24rpx; color: #9CA3AF; }
.ed-close { margin-left: auto; width: 64rpx; height: 64rpx; border-radius: 50%; background: #262A34; display: flex; align-items: center; justify-content: center; }
/* 列：把手 · 级 · 小盲 · 大盲 · 前注 · 分钟 · 删除。休息、截止买入那一行的文字横跨小盲到前注（第 3～5 列） */
.eg { display: grid; grid-template-columns: 36rpx 44rpx 1fr 1fr 1fr 84rpx 52rpx; column-gap: 10rpx; align-items: center; }
.ed-cols { padding: 0 20rpx 12rpx 24rpx; }
.ed-col { text-align: center; font-size: 22rpx; color: #6B7280; }
.ed-list { flex: 1; height: 0; box-sizing: border-box; padding: 0 20rpx 0 24rpx; }
.ed-row { position: relative; height: 84rpx; transition: transform .2s ease; }
.ed-row-drag { transition: none; border-radius: 16rpx; background: #2A2D36; box-shadow: 0 16rpx 32rpx rgba(0, 0, 0, .45); }
.ed-grip { height: 84rpx; display: flex; align-items: center; justify-content: center; }
.ed-no { display: flex; align-items: center; justify-content: center; font-family: "BoardNum", sans-serif; font-weight: 700; font-size: 30rpx; color: #6B7280; }
.ed-cell { height: 64rpx; border-radius: 14rpx; background: #262A34; border: 2rpx solid transparent; text-align: center; font-size: 28rpx; color: #E5E7EB; }
.ed-cell-on { border-color: #DC0000; background: #2A2D36; }
.ed-span { grid-column: 3 / 6; height: 64rpx; padding-left: 20rpx; border-radius: 14rpx; display: flex; align-items: center; font-size: 26rpx; font-weight: 500; }
.ed-span-b { background: #24231F; color: #C9A24A; }
.ed-span-c { background: #272124; color: #C86A6A; }
.ed-span-i { margin-left: auto; margin-right: 14rpx; display: flex; align-items: center; }
.ed-span-n { margin-left: 6rpx; font-size: 20rpx; }
.ed-no-tap { position: relative; display: flex; align-items: center; justify-content: center; height: 64rpx; }
.ed-note-dot { position: absolute; right: 2rpx; top: 6rpx; width: 12rpx; height: 12rpx; border-radius: 50%; background: #C9A24A; }
.ed-note-dot-c { background: #FF4D4D; }
.ov-note { z-index: 220; }
.note-card { position: absolute; left: 48rpx; right: 48rpx; top: 22%; padding: 36rpx 32rpx 28rpx; border-radius: 40rpx; background: #262A34; border: 1rpx solid #3A3D46; }
.note-t { display: block; font-size: 32rpx; font-weight: 600; color: #FFFFFF; }
.note-s { display: block; margin-top: 10rpx; font-size: 23rpx; color: #9CA3AF; }
.note-preset { display: block; margin-top: 8rpx; padding: 14rpx 18rpx; border-radius: 16rpx; background: #1F222A; font-size: 23rpx; line-height: 1.6; color: #C9CDD4; }
.note-in { width: 100%; height: 180rpx; margin-top: 18rpx; padding: 18rpx; box-sizing: border-box; border-radius: 20rpx; background: #1F222A; font-size: 26rpx; line-height: 1.6; color: #FFFFFF; }
.note-count { display: block; margin-top: 8rpx; text-align: right; font-size: 22rpx; color: #6B7280; }
.note-acts { margin-top: 16rpx; display: flex; }
.note-btn { flex: 1; height: 84rpx; margin-right: 16rpx; border-radius: 999rpx; background: #35383F; display: flex; align-items: center; justify-content: center; }
.note-ok { margin-right: 0; background: #DC0000; }
.note-btn-t { font-size: 28rpx; font-weight: 600; color: #FFFFFF; }
.ed-del { width: 52rpx; height: 52rpx; border-radius: 12rpx; display: flex; align-items: center; justify-content: center; }
.ed-adds { display: flex; justify-content: center; padding: 20rpx 24rpx 0; border-top: 1px solid #2A2D36; }
.ed-add { height: 64rpx; margin: 0 8rpx; padding: 0 22rpx; border-radius: 999rpx; border: 2rpx solid #35383F; display: flex; align-items: center; }
.ed-add-t { margin-left: 6rpx; font-size: 24rpx; color: #9CA3AF; }
.ed-add-b { color: #C9A24A; }
.ed-add-c { color: #C86A6A; }
.ed-actions { display: flex; padding: 24rpx 24rpx 28rpx; }
.btn-2 { width: 190rpx; height: 88rpx; border-radius: 999rpx; background: #35383F; display: flex; align-items: center; justify-content: center; font-size: 30rpx; color: #FFFFFF; }
.btn-1 { flex: 1; margin-left: 20rpx; height: 88rpx; border-radius: 999rpx; background: #DC0000; display: flex; align-items: center; justify-content: center; font-size: 30rpx; font-weight: 500; color: #FFFFFF; }

/* 滚轮 */
.pv-cols { display: flex; padding: 8rpx 0 4rpx; }
.pv-col { flex: 1; text-align: center; font-size: 22rpx; color: #6B7280; }
.pv { width: 100%; height: 400rpx; }
.pv-item { height: 80rpx; line-height: 80rpx; text-align: center; font-size: 32rpx; color: #FFFFFF; }
.pv-ind { height: 80rpx; border-radius: 20rpx; background: rgba(255, 255, 255, .06); }
.pv-ind::before, .pv-ind::after { border: none; }

/* 比赛方案（中央） */
.md {
  position: absolute; left: 48rpx; right: 48rpx; top: 50%; transform: translateY(-50%); padding: 32rpx 24rpx 28rpx;
  background: #262A34; border: 1rpx solid #3A3D46; border-radius: 48rpx;
}
.md-head { display: flex; align-items: center; padding: 0 8rpx 16rpx; }
.md-sub { margin-left: 16rpx; }
.md-close { margin-left: auto; width: 64rpx; height: 64rpx; border-radius: 50%; background: #35383F; display: flex; align-items: center; justify-content: center; }
.tpl { width: 176rpx; height: 216rpx; margin: 8rpx; padding: 12rpx; justify-content: flex-start; }
.tpl-cover { width: 100%; height: 88rpx; border-radius: 14rpx; background-size: cover; background-position: right center; }
.tpl-name { margin-top: 14rpx; max-width: 100%; font-size: 24rpx; font-weight: 500; color: #FFFFFF; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.tpl-meta { margin-top: 6rpx; max-width: 100%; font-size: 20rpx; color: #9CA3AF; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.tpl.tile-new { justify-content: center; }
</style>
