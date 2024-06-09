import chalk from "chalk"
import express, { json } from "express"
import dotenv from "dotenv"
import { MongoClient } from "mongodb"
import cors from "cors"
import Joi from "joi"


dotenv.config()
const LINK = process.env.LINK
const PORT = process.env.PORT
const mongoClient = new MongoClient(LINK)

const nomeSchema = Joi.object({
    "name": Joi.string().min(2).required() 
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
                console.log("usuario existe: ", usuarioExiste)
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

        app.listen(5000, console.log(chalk.cyan("Servidor funcionando")))

    }catch(e){
        console.log(chalk.red("Erro ao conectar o banco de dados: ", e))
    }
}

servidor()