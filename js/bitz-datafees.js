'use strict';
class BitZDatafeed {
    constructor(options) {
        this.bitzHost = 'https://api.bitzspeed.com'
        this.debug = options.debug || false
    }

    bitzServerTime() {	
        return fetch(this.bitzHost + '/').then(res => {
            return res.json()
        }).then(json => {
            return json.time
        })
    }

    bitzSymbols() {
        return fetch(this.bitzHost + '/Market/tickerall').then(res => {
            return res.json()
        }).then(json => {
            return json.data
        })
    }

    bitzKlines(symbol, interval, startTime, endTime, limit) {
        const url = this.bitzHost + '/Market/kline' +
            "?symbol=".concat(symbol) +
            "&resolution=".concat(interval) +
            "&limit=".concat(limit) +
            // "&from=".concat(startTime) +
            "&to=".concat(endTime)

        return fetch(url).then(res => {
            return res.json()
        }).then(json => {
            return json["data"]["bars"]
        })
    }

    onReady(callback) {
        this.bitzSymbols().then((symbols) => {
            this.symbols = symbols
            callback({
                supports_marks: false,
                supports_timescale_marks: false,
                supports_time: true,
                supported_resolutions: [
                    '1', '3', '5', '15', '30', '60', '120', '240', '360', '480', '720', '1D', '3D', '1W', '1M'
                ]
            })
        }).catch(err => {
            console.error(err)
        })
    }

    searchSymbols(userInput, exchange, symbolType, onResultReadyCallback) {
        userInput = userInput.toUpperCase()
        onResultReadyCallback(
            this.symbols.filter((symbol) => {
                return symbol.symbol.indexOf(userInput) >= 0
            }).map((symbol) => {
                return {
                    symbol: symbol.symbol,
                    full_name: symbol.symbol,
                    description: symbol.baseAsset + ' / ' + symbol.quoteAsset,
                    ticker: symbol.symbol,
                    //exchange: 'Binance',
                    //type: 'crypto'
                }
            })
        )
    }

    resolveSymbol(symbolName, onSymbolResolvedCallback, onResolveErrorCallback) {
        this.debug && console.log('👉 resolveSymbol:', symbolName)

        const comps = symbolName.split('_')
        const symbolBase =  comps[0].toUpperCase()
		const symbolQuote = comps[1].toUpperCase()

        for (let symbol in this.symbols) {
            if (symbol == symbolName) {
                setTimeout(() => {
                    onSymbolResolvedCallback({
                        name: symbol.toUpperCase(),
                        description: symbolBase + ' / ' + symbolQuote,
                        ticker: symbol,
                        session: '24x7',
                        minmov: 1,
                        pricescale: this.symbols[symbol].pricePrecision,
                        timezone: 'UTC',
                        has_intraday: true,
                        has_daily: true,
                        has_weekly_and_monthly: true,
                        currency_code: symbolBase
                    })
                }, 0)
                return
            }
        }

        onResolveErrorCallback('not found')
    }

    getBars(symbolInfo, resolution, from, to, onHistoryCallback, onErrorCallback, firstDataRequest) {
        if (this.debug) {
            console.log('👉 getBars:', symbolInfo.name, resolution)
            console.log('First:', firstDataRequest)
            console.log('From:', from, '(' + new Date(from * 1000).toGMTString() + ')')
            console.log('To:  ', to, '(' + new Date(to * 1000).toGMTString() + ')')
        }

        const interval = {
            '1': '1min',
            '5': '5min',
            '15': '15min',
            '30': '30min',
            '60': '60min',
            '240': '4hour',
            'D': '1day',
            '1D': '1day',
            'W': '1week',
            '1W': '1week',
            'M': '1mon',
            '1M': '1mon',
        }[resolution]

        if (!interval) {
            onErrorCallback('Invalid interval')
        }

        let totalKlines = []

        const finishKlines = () => {
            if (this.debug) {
                console.log('📊:', totalKlines.length)
            }

            if (totalKlines.length == 0) {
                onHistoryCallback([], { noData: true })
            } else {
                onHistoryCallback(totalKlines.map(kline => {
					return {
					    time: parseInt(kline["time"]),
					    close: parseFloat(kline["close"]),
					    open: parseFloat(kline["open"]),
					    high: parseFloat(kline["high"]),
					    low: parseFloat(kline["low"]),
					    volume: parseFloat(kline["volume"])
					}
                }), {
                        noData: false
                    })
            }
        }

        const getKlines = (from, to) => {
            this.bitzKlines(symbolInfo.name.toLowerCase(), interval, from, to, 300).then(klines => {
				totalKlines = totalKlines.concat(klines)
                finishKlines()
            }).catch(err => {
                console.error(err)
                onErrorCallback('Some problem')
            })
        }

        from *= 1000
        to *= 1000

        getKlines(from, to)
    }

    subscribeBars(symbolInfo, resolution, onRealtimeCallback, subscriberUID, onResetCacheNeededCallback) {
        this.debug && console.log('👉 subscribeBars:', subscriberUID)
    }

    unsubscribeBars(subscriberUID) {
        this.debug && console.log('👉 unsubscribeBars:', subscriberUID)
    }

    getServerTime(callback) {
        this.bitzServerTime().then(time => {
            callback(Math.floor(time / 1000))
        }).catch(err => {
            console.error(err)
        })
    }
}

