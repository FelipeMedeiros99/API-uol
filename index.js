import chalk from "chalk"
import express, { json } from "express"
import dotenv from "dotenv"
import { MongoClient } from "mongodb"
import cors from "cors"
import Joi from "joi"
import dayjs from "dayjs"

dotenv.config()
const LINK = process.env.LINK
const PORT = process.env.PORT
const mongoClient = new MongoClient(LINK)

const nomeSchema = Joi.object({
    "name": Joi.string().min(2).required() 
})

const mensagemSchema = Joi.object({
    "to": Joi.string().required(),
    "text": Joi.string().required(),
    "type": Joi.valid("message", "private_message").required()
})


async function conexaoBanco() {
    try{
        await mongoClient.connect()
        console.log(chalk.cyan("Banco de dados conectado"))
        const banco = mongoClient.db("uol")
        return banco
        
    }catch(e){
        console.log(chalk.red("erro ao conectar ao banco de dados: ", e))
        return undefined
    }

}


async function servidor() {
    
    console.clear()
    
    try {
        const banco = await conexaoBanco()

        const app = express()
        app.use(cors())
        app.use(json())

        app.post("/participants", async(req, res)=>{
            const {body:nome} = req
            
            try{
                await nomeSchema.validateAsync(nome, {abortEarly:false})
                const usuarioExiste = await banco.collection("usuarios").findOne({name: nome.name})
                if(usuarioExiste){
                    res.status(409).send("Um usuário com esse nome já está online")
                    console.log(chalk.red("Um usuário com esse nome já está online"))
                    return
                }

                await banco.collection("usuarios").insertOne({...nome, lastStatus: Date.now()})
                console.log("usuário salvo com sucesso")
                res.sendStatus(201)

            }catch(e){
                
                console.log(chalk.red("Erro ao salvar usuário: ", e))
                res.status(422).send(`Erro ao salvar usuário: ${e}`)
            
            }
        })

        app.get("/participants", async(req, res)=>{
            try{
                const usuarios = await banco.collection("usuarios").find().toArray()
                res.status(200).send(usuarios)
            }catch(e){
                res.status(404).send("Erro ao buscar usuários")
            }
        })

        app.post("/messages", async (req, res)=>{
            const {body:mensagem} = req
            const {user} = req.headers

            try{
                await mensagemSchema.validateAsync(mensagem, {abortEarly:false})
                const data = dayjs()
                const time = `${data["$H"]}:${data["$m"]}:${data["$s"]}`

                await banco.collection("mensagens").insertOne({...mensagem, from:user, time})        
                res.sendStatus(200)
    
            }catch(e){
                res.send("Erro ao enviar mensagem", e)
            }
        })




        app.listen(PORT, console.log(chalk.cyan("Servidor funcionando")))

    }catch(e){
        console.log(chalk.red("Erro ao conectar o banco de dados: ", e))
    }
}

servidor()