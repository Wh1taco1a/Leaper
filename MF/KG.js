"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const axios_1 = require("axios");
const cheerio_1 = require("cheerio");

const pageSize = 20;

function formatMusicItem(_) {
    var _a, _b, _c, _d, _e, _f, _g;
    return {
        id: _.hash,
        title: _.songname,
        artist: (_a = _.singername) !== null && _a !== void 0 ? _a : (((_c = (_b = _.authors) === null || _b === void 0 ? void 0 : _b.map((_) => { var _a; return (_a = _ === null || _ === void 0 ? void 0 : _.author_name) !== null && _a !== void 0 ? _a : ""; })) === null || _c === void 0 ? void 0 : _c.join(", ")) ||
            ((_f = (_e = (_d = _.filename) === null || _d === void 0 ? void 0 : _d.split("-")) === null || _e === void 0 ? void 0 : _e[0]) === null || _f === void 0 ? void 0 : _f.trim())),
        album: (_g = _.album_name) !== null && _g !== void 0 ? _g : _.remark,
        album_id: _.album_id,
        album_audio_id: _.album_audio_id,
        artwork: _.album_sizable_cover
            ? _.album_sizable_cover.replace("{size}", "400")
            : undefined,
        "320hash": _["320hash"],
        sqhash: _.sqhash,
        origin_hash: _.origin_hash,
    };
}
function formatImportMusicItem(_) {
    var _a, _b, _c, _d, _e, _f, _g;
    let title = _.name;
    const singerName = _.singername;
    if (singerName && title) {
        const index = title.indexOf(singerName);
        if (index !== -1) {
            title = (_a = title.substring(index + singerName.length + 2)) === null || _a === void 0 ? void 0 : _a.trim();
        }
        if (!title) {
            title = singerName;
        }
    }
    const qualites = _.relate_goods;
    return {
        id: _.hash,
        title,
        artist: singerName,
        album: (_b = _.albumname) !== null && _b !== void 0 ? _b : "",
        album_id: _.album_id,
        album_audio_id: _.album_audio_id,
        artwork: (_d = (_c = _ === null || _ === void 0 ? void 0 : _.info) === null || _c === void 0 ? void 0 : _c.image) === null || _d === void 0 ? void 0 : _d.replace("{size}", "400"),
        "320hash": (_e = qualites === null || qualites === void 0 ? void 0 : qualites[1]) === null || _e === void 0 ? void 0 : _e.hash,
        sqhash: (_f = qualites === null || qualites === void 0 ? void 0 : qualites[2]) === null || _f === void 0 ? void 0 : _f.hash,
        origin_hash: (_g = qualites === null || qualites === void 0 ? void 0 : qualites[3]) === null || _g === void 0 ? void 0 : _g.hash,
    };
}
const headers = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/106.0.0.0 Safari/537.36",
    Accept: "*/*",
    "Accept-Encoding": "gzip, deflate",
    "Accept-Language": "zh-CN,zh;q=0.9",
};

// 搜索歌曲
async function searchMusic(query, page) {
    const res = (await axios_1.default.get("http://mobilecdn.kugou.com/api/v3/search/song", {
        headers,
        params: {
            format: "json",
            keyword: query,
            page,
            pagesize: pageSize,
            showtype: 1,
        },
    })).data;
    const songs = res.data.info.map(formatMusicItem);
    return {
        isEnd: page * pageSize >= res.data.total,
        data: songs,
    };
}

// 搜索作者
async function searchArtist(query, page) {
    return {
        isEnd: false,
        data: null,
    };
}

// 搜索专辑
async function searchAlbum(query, page) {
    const res = (await axios_1.default.get("http://msearch.kugou.com/api/v3/search/album", {
        headers,
        params: {
            version: 9108,
            iscorrection: 1,
            highlight: "em",
            plat: 0,
            keyword: query,
            pagesize: 20,
            page,
            sver: 2,
            with_res_tag: 0,
        },
    })).data;
    const albums = res.data.info.map((_) => {
        var _a, _b;
        return ({
            id: _.albumid,
            artwork: (_a = _.imgurl) === null || _a === void 0 ? void 0 : _a.replace("{size}", "400"),
            artist: _.singername.replace(/<em>|<\/em>/g, ""),
            title: (0, cheerio_1.load)(_.albumname).text(),
            description: _.intro,
            date: (_b = _.publishtime) === null || _b === void 0 ? void 0 : _b.slice(0, 10),
        });
    });
    return {
        isEnd: page * 20 >= res.data.total,
        data: albums,
    };
}

// 搜索歌单
async function searchMusicSheet(query, page) {
    const res = (await axios_1.default.get("http://mobilecdn.kugou.com/api/v3/search/special", {
        headers,
        params: {
            format: "json",
            keyword: query,
            page,
            pagesize: pageSize,
            showtype: 1,
        },
    })).data;
    const sheets = res.data.info.map(item => ({
        title: item.specialname,
        createAt: item.publishtime,
        description: item.intro,
        artist: item.nickname,
        coverImg: item.imgurl,
        gid: item.gid,
        playCount: item.playcount,
        id: item.specialid,
        worksNum: item.songcount
    }));
    return {
        isEnd: page * pageSize >= res.data.total,
        data: sheets,
    };
}

// （根据音质）获取音源
async function getMediaSource(musicItem, quality) {
    let hash;
    if (quality === "low") {
        hash = musicItem.id;
    } else if (quality === "standard") {
        hash = musicItem["320hash"];
    } else if (quality === "high") {
        hash = musicItem.sqhash;
    } else {
        hash = musicItem.id;
    }
    if (!hash) {
        return;
    }
	// 获取专辑图片和歌词
    const infores = (await axios_1.default.get("https://wwwapi.kugou.com/yy/index.php", {
        headers,
        params: {
            r: "play/getdata",
            hash: hash,
            appid: "1014",
            mid: "56bbbd2918b95d6975f420f96c5c29bb",
            album_id: musicItem.album_id,
            album_audio_id: musicItem.album_audio_id,
            _: Date.now(),
        },
    })).data.data;
	let url = infores.play_url || infores.play_backup_url;
    if (!url) {
        // 获取歌曲地址
		const res = (await axios_1.default.get(`http://106.52.249.141:13006/api?action=kugou&hash=${hash}&album_id=${musicItem.album_id}&album_audio_id=${musicItem.album_audio_id}`)).data;
		url = res.url;
    }
	return {
		url: url,
        rawLrc: infores.lyrics,
        artwork: infores.img,
	};
}




async function getTopLists() {
    const lists = (await axios_1.default.get("http://mobilecdnbj.kugou.com/api/v3/rank/list?version=9108&plat=0&showtype=2&parentid=0&apiver=6&area_code=1&withsong=0&with_res_tag=0", {
        headers: headers,
    })).data.data.info;
    const res = [
        {
            title: "热门榜单",
            data: [],
        },
        {
            title: "特色音乐榜",
            data: [],
        },
        {
            title: "全球榜",
            data: [],
        },
    ];
    const extra = {
        title: "其他",
        data: [],
    };
    lists.forEach((item) => {
        var _a, _b, _c, _d;
        if (item.classify === 1 || item.classify === 2) {
            res[0].data.push({
                id: item.rankid,
                description: item.intro,
                coverImg: (_a = item.imgurl) === null || _a === void 0 ? void 0 : _a.replace("{size}", "400"),
                title: item.rankname,
            });
        }
        else if (item.classify === 3 || item.classify === 5) {
            res[1].data.push({
                id: item.rankid,
                description: item.intro,
                coverImg: (_b = item.imgurl) === null || _b === void 0 ? void 0 : _b.replace("{size}", "400"),
                title: item.rankname,
            });
        }
        else if (item.classify === 4) {
            res[2].data.push({
                id: item.rankid,
                description: item.intro,
                coverImg: (_c = item.imgurl) === null || _c === void 0 ? void 0 : _c.replace("{size}", "400"),
                title: item.rankname,
            });
        }
        else {
            extra.data.push({
                id: item.rankid,
                description: item.intro,
                coverImg: (_d = item.imgurl) === null || _d === void 0 ? void 0 : _d.replace("{size}", "400"),
                title: item.rankname,
            });
        }
    });
    if (extra.data.length !== 0) {
        res.push(extra);
    }
    return res;
}
async function getTopListDetail(topListItem) {
    const res = await axios_1.default.get(`http://mobilecdnbj.kugou.com/api/v3/rank/song?version=9108&ranktype=0&plat=0&pagesize=100&area_code=1&page=1&volid=35050&rankid=${topListItem.id}&with_res_tag=0`, {
        headers,
    });
    return Object.assign(Object.assign({}, topListItem), { musicList: res.data.data.info.map(formatMusicItem) });
}
async function getAlbumInfo(albumItem, page = 1) {
    const res = (await axios_1.default.get("http://mobilecdn.kugou.com/api/v3/album/song", {
        params: {
            version: 9108,
            albumid: albumItem.id,
            plat: 0,
            pagesize: 100,
            area_code: 1,
            page,
            with_res_tag: 0,
        },
    })).data;
    return {
        isEnd: page * 100 >= res.data.total,
        albumItem: {
            worksNum: res.data.total,
        },
        musicList: res.data.info.map((_) => {
            var _a;
            const [artist, songname] = _.filename.split("-");
            return {
                id: _.hash,
                title: songname.trim(),
                artist: artist.trim(),
                album: (_a = _.album_name) !== null && _a !== void 0 ? _a : _.remark,
                album_id: _.album_id,
                album_audio_id: _.album_audio_id,
                artwork: albumItem.artwork,
                "320hash": _["320hash"],
                sqhash: _.sqhash,
                origin_hash: _.origin_hash,
            };
        }),
    };
}
async function importMusicSheet(urlLike) {
    var _a;
    let id = (_a = urlLike.match(/^(?:.*?)(\d+)(?:.*?)$/)) === null || _a === void 0 ? void 0 : _a[1];
    let musicList = [];
    if (!id) {
        return;
    }
    let res = await axios_1.default.post(`http://t.kugou.com/command/`, {
        appid: 1001,
        clientver: 9020,
        mid: "21511157a05844bd085308bc76ef3343",
        clienttime: 640612895,
        key: "36164c4015e704673c588ee202b9ecb8",
        data: id,
    });
    if (res.status === 200 && res.data.status === 1) {
        let data = res.data.data;
        let response = await axios_1.default.post(`http://www2.kugou.kugou.com/apps/kucodeAndShare/app/`, {
            appid: 1001,
            clientver: 10112,
            mid: "70a02aad1ce4648e7dca77f2afa7b182",
            clienttime: 722219501,
            key: "381d7062030e8a5a94cfbe50bfe65433",
            data: {
                id: data.info.id,
                type: 3,
                userid: data.info.userid,
                collect_type: data.info.collect_type,
                page: 1,
                pagesize: data.info.count,
            },
        });
        if (response.status === 200 && response.data.status === 1) {
            let resource = [];
            response.data.data.forEach((song) => {
                resource.push({
                    album_audio_id: 0,
                    album_id: "0",
                    hash: song.hash,
                    id: 0,
                    name: song.filename.replace(".mp3", ""),
                    page_id: 0,
                    type: "audio",
                });
            });
            let postData = {
                appid: 1001,
                area_code: "1",
                behavior: "play",
                clientver: "10112",
                dfid: "2O3jKa20Gdks0LWojP3ly7ck",
                mid: "70a02aad1ce4648e7dca77f2afa7b182",
                need_hash_offset: 1,
                relate: 1,
                resource,
                token: "",
                userid: "0",
                vip: 0,
            };
            var result = await axios_1.default.post(`https://gateway.kugou.com/v2/get_res_privilege/lite?appid=1001&clienttime=1668883879&clientver=10112&dfid=2O3jKa20Gdks0LWojP3ly7ck&mid=70a02aad1ce4648e7dca77f2afa7b182&userid=390523108&uuid=92691C6246F86F28B149BAA1FD370DF1`, postData, {
                headers: {
                    "x-router": "media.store.kugou.com",
                },
            });
            if (response.status === 200 && response.data.status === 1) {
                musicList = result.data.data
                    .map(formatImportMusicItem);
            }
        }
    }
    return musicList;
}

// 某个tag下的所有歌单
async function getRecommendSheetsByTag(tag, page) {
    return {
        isEnd: false,
        data: null,
    };
}
module.exports = {
    platform: "酷狗",
    version: "0.0.5",
    author: 'Wh1taco1a/小诚',
    appVersion: ">0.1.0-alpha.0",
    srcUrl: "http://www.skeo.net/music/kugou.js",
    cacheControl: "no-cache",
    primaryKey: ["id", "album_id", "album_audio_id"],
    hints: {
        importMusicSheet: [
            "仅支持酷狗APP通过酷狗码导入，输入纯数字酷狗码即可。",
            "导入时间和歌单大小有关，请耐心等待",
        ],
    },
    supportedSearchType: ["music", "artist", "album", "sheet",],
    async search(query, page, type) {
        if (type === "music") {
            return await searchMusic(query, page);
        } else if (type === "artist") {
            return await searchArtist(query, page);
        } else if (type === "album") {
            return await searchAlbum(query, page);
        } else if (type === "sheet") {
            return await searchMusicSheet(query, page);
        }
    },
    getMediaSource,
	getMusicInfo: getMediaSource,
    getLyric: getMediaSource,
	
    getTopLists,
    getTopListDetail,
    getAlbumInfo,
    importMusicSheet,
	
	
	getRecommendSheetsByTag,
};
