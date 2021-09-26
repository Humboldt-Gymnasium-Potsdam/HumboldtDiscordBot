import {EventEmitter} from "events";
import requestModule from "request";
import cheerio from "cheerio";
import * as domHandler from "domhandler";
import moment from "moment";
import {MoodleProcessor} from "./moodleProcessor.js";

export class MoodleInterface extends EventEmitter {
    constructor(logger, config) {
        super();

        this.timeoutId = null;
        this.nextScheduledScrape = null;

        this.logger = logger;
        this.config = config.moodle;
        this.cookieJar = requestModule.jar();
        this.request = requestModule.defaults({
            jar: this.cookieJar,
            followAllRedirects: true
        });
    }

    scrapeNow() {
        this.logger.info("Scraping moodle now...");

        return new Promise((resolve, reject) => {
            let responseData = "";

            this.request.get(this.config.urls.course)
                .on("data", (data) => responseData += data.toString())
                .on("complete", (response) => {
                    if (response.statusCode !== 200) {
                        return reject(new Error(
                            `Bad status code while querying download url, expected 200 but got ${response.statusCode}`
                        ));
                    } else if (responseData.length < 1) {
                        return reject(new Error(
                            "Empty body received while querying download url"
                        ));
                    }

                    const html = cheerio.load(responseData);

                    for (const a of html("a").toArray()) {
                        for (const child of a.children) {
                            if (!domHandler.isTag(child)) {
                                continue;
                            }

                            this.logger.verbose(`Considering ${html(child)} as possible download link...`);
                            if (child.tagName === "span" && html(child).text().startsWith(this.config.texts.tableName)) {
                                const href = html(a).attr("href")?.trim() ?? "";

                                if (href.length < 1) {
                                    return reject(new Error(
                                        "Empty href element while querying download url"
                                    ));
                                }

                                this.logger.debug(`Moodle table download link is ${href}`);
                                return resolve(href);
                            }
                        }
                    }

                    return reject(new Error("Failed to find download url"));
                })
                .on("error", (error) => reject(error));
        }).then((downloadUrl) => new Promise((resolve, reject) => {
            let responseData = Buffer.of();

            this.request.get(downloadUrl)
                .on("data", (data) => {
                    if (typeof (data) === "string") {
                        responseData = Buffer.concat([responseData, Buffer.from(data, "binary")]);
                    } else {
                        responseData = Buffer.concat([responseData, data]);
                    }
                })
                .on("complete", (response) => {
                    if (response.statusCode !== 200) {
                        return reject(new Error(
                            `Bad status code while downloading table, expected 200 but got ${response.statusCode}`
                        ));
                    } else if (responseData.length < 1) {
                        return reject(new Error(
                            "Empty body received while downloading table"
                        ));
                    }

                    return resolve(responseData);
                })
                .on("error", (error) => reject(error));
        })).then((buffer) => MoodleProcessor.process(buffer));
    }

    performLogin() {
        return new Promise((resolve, reject) => {
            let responseData = "";

            this.request.post(this.config.urls.login).form({
                username: this.config.username,
                password: this.config.password,
                submit: ""
            }).on("data", (data) => {
                responseData += data.toString();
            }).on("complete", (response) => {
                if (response.statusCode !== 200) {
                    return reject(new Error(
                        `Bad status code while logging into moodle, expected 200 but got ${response.statusCode}`
                    ));
                } else if (responseData.length < 1) {
                    return reject(new Error(
                        "Empty body received while logging into moodle"
                    ));
                }

                const html = cheerio.load(responseData);
                if (html(".logininfo").first().text().toLowerCase().includes(this.config.texts.loginSuccess)) {
                    resolve();
                } else {
                    reject(new Error(".loginfo didn't indicate a successful login"));
                }
            }).on("error", (error) => {
                reject(error);
            });
        });
    }

    async rescheduleScrape() {
        if (this.timeoutId !== null) {
            clearTimeout(this.timeoutId);
        } else {
            await this.performScrape();
        }

        this.nextScheduledScrape = moment().add(this.config.scrapeInterval, "second");
        this.timeoutId = setTimeout(
            () => this.performScrape().then(() => this.rescheduleScrape()),
            this.config.scrapeInterval * 1000
        );
    }

    performScrape() {
        return this.scrapeNow().then((data) => {
            this.logger.verbose(`Moodle data loaded for ${data.timeInfo.dayNumerical}.${data.timeInfo.monthNumerical}`);
            this.emit("data", data);
        }).catch((error) => {
            this.logger.verbose(`Failed to load moodle data: ${error}`);
            this.emit("error", error);
        });
    }
}
