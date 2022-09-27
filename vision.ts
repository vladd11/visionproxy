import {serviceClients, Session} from '@yandex-cloud/nodejs-sdk';
import {
    AnalyzeResult,
    BatchAnalyzeRequest,
    Feature_Type
} from "@yandex-cloud/nodejs-sdk/dist/generated/yandex/cloud/ai/vision/v1/vision_service";
import * as fs from "fs";
import sizeOfPolygon from "./sizeOfPolygon";
import express from "express";

const session = new Session({oauthToken: process.env.OAUTH_TOKEN!})
const client = session.client(serviceClients.VisionServiceClient)

async function analyze(images: Buffer[]): Promise<AnalyzeResult[]> {
    return (await (client.batchAnalyze(BatchAnalyzeRequest.fromPartial({
        folderId: "b1ge3lgc8br8tb6o6vcd",
        analyzeSpecs: images.map(image => {
            return {
                mimeType: "image/png",
                content: image,
                features: [{
                    type: Feature_Type.TEXT_DETECTION,
                    textDetectionConfig: {
                        model: "page",
                        languageCodes: ["ru"]
                    }
                }]
            }
        })
    })))).results
}

const app = express()

app.use(express.raw({type: 'image/jpeg', limit: "1mb"}))

app.post('/', async (req, res) => {
    fs.writeFile("img.jpeg", req.body, console.error)
    const results = await analyze([req.body])

    results.map((result) => {
        if(result.error !== undefined) {
            console.trace(result.error)
            return;
        }

        result.results[0].textDetection?.pages[0].blocks.forEach(block => {
            block.lines.forEach(line => {
                if(line.boundingBox === undefined) return;

                line.words.forEach(word => {
                    console.log(`Word: "${word.text}", confidence ${word.confidence}, bbox size: ${sizeOfPolygon(line.boundingBox!.vertices)}`)
                })
            })
        })
    })
})

app.listen(3000, () => {
    console.log(`Example app listening on port 3000`)
})
