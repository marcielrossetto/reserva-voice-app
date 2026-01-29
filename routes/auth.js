/**
 * routes/auth.js - COM BCRYPTJS PARA CRIPTOGRAFAR SENHAS
 */

const express = require('express');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');

const router = express.Router();
const prisma = new PrismaClient();

const JWT_SECRET = process.env.JWT_SECRET || 'sua-chave-secreta-aqui';

// ========== NODEMAILER ==========
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD
    }
});

// ========== UTILITÁRIOS ==========
function gerarToken() {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

function validarSenhaForte(senha) {
    const maius = /[A-Z]/.test(senha);
    const minus = /[a-z]/.test(senha);
    const numero = /[0-9]/.test(senha);
    const especial = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(senha);
    const comprimento = senha.length >= 8;
    
    return maius && minus && numero && especial && comprimento;
}

function gerarJWT(empresa) {
    return jwt.sign(
        { id: empresa.id, email: empresa.email, empresaId: empresa.id },
        JWT_SECRET,
        { expiresIn: '7d' }
    );
}

// ✅ CRIPTOGRAFAR SENHA
async function criptografarSenha(senha) {
    const salt = await bcrypt.genSalt(10);
    return await bcrypt.hash(senha, salt);
}

// ✅ COMPARAR SENHA
async function compararSenha(senha, senhaHash) {
    return await bcrypt.compare(senha, senhaHash);
}

async function enviarEmailToken(email, token, tipo = 'recuperacao') {
    try {
        const assunto = tipo === 'recuperacao' ? '🔐 Código de Recuperação de Senha' : '🎉 Bem-vindo!';
        const html = tipo === 'recuperacao' ? `
            <div style="font-family: Arial; max-width: 600px; margin: 0 auto;">
                <h2>Recuperação de Senha</h2>
                <p>Seu código de verificação:</p>
                <div style="background: #f0f0f0; padding: 20px; text-align: center; border-radius: 8px;">
                    <h1 style="color: #667eea; letter-spacing: 3px; margin: 0;">${token}</h1>
                </div>
                <p><strong>⏰ Código válido por 15 minutos</strong></p>
            </div>
        ` : `
            <div style="font-family: Arial; max-width: 600px; margin: 0 auto;">
                <h2>Bem-vindo ao Reserva Voice App!</h2>
                <p>Sua empresa foi cadastrada com sucesso!</p>
                <p>Você pode fazer login com: <strong>${email}</strong></p>
            </div>
        `;

        await transporter.sendMail({
            from: process.env.EMAIL_USER,
            to: email,
            subject: assunto,
            html
        });

        return true;
    } catch (error) {
        console.error('❌ Erro ao enviar email:', error);
        return false;
    }
}

// ========== POST /auth/login ==========
router.post('/login', async (req, res) => {
    try {
        const { email, senha } = req.body;

        if (!email || !senha) {
            return res.status(400).json({ erro: 'E-mail e senha obrigatórios' });
        }

        const empresa = await prisma.empresa.findFirst({
            where: { email: email.toLowerCase() }
        });

        if (!empresa) {
            return res.status(401).json({ erro: 'E-mail ou senha incorretos' });
        }

        // ✅ COMPARAR SENHA CRIPTOGRAFADA
        const senhaValida = await compararSenha(senha, empresa.senha);
        if (!senhaValida) {
            return res.status(401).json({ erro: 'E-mail ou senha incorretos' });
        }

        if (empresa.dataExpiracao && new Date() > new Date(empresa.dataExpiracao)) {
            return res.status(403).json({ erro: 'Período de teste expirado' });
        }

        const token = gerarJWT(empresa);

        console.log(`✅ Login: ${email}`);
        res.json({
            sucesso: true,
            token,
            empresaId: empresa.id,
            nomeEmpresa: empresa.nomeEmpresa,
            email: empresa.email
        });
    } catch (error) {
        console.error('❌ Erro login:', error);
        res.status(500).json({ erro: 'Erro ao fazer login' });
    }
});

// ========== POST /auth/cadastro ==========
router.post('/cadastro', async (req, res) => {
    try {
        const { nomeEmpresa, telefone, cnpjCpf, email, senha } = req.body;

        if (!nomeEmpresa || !telefone || !cnpjCpf || !email || !senha) {
            return res.status(400).json({ erro: 'Preencha todos os campos' });
        }

        if (!validarSenhaForte(senha)) {
            return res.status(400).json({ 
                erro: 'Senha fraca. Requisitos: maiúscula, minúscula, número, caractere especial, mín. 8 caracteres' 
            });
        }

        const empresaExistente = await prisma.empresa.findFirst({
            where: { email: email.toLowerCase() }
        });

        if (empresaExistente) {
            return res.status(400).json({ erro: 'E-mail já cadastrado' });
        }

        // ✅ CRIPTOGRAFAR SENHA ANTES DE SALVAR
        const senhaHash = await criptografarSenha(senha);

        const dataExpiracao = new Date();
        dataExpiracao.setDate(dataExpiracao.getDate() + 7);

        const empresa = await prisma.empresa.create({
            data: {
                nomeEmpresa: nomeEmpresa.trim(),
                email: email.toLowerCase(),
                telefone: telefone.trim(),
                cnpjCpf: cnpjCpf.trim(),
                senha: senhaHash, // ✅ SALVAR HASH, NÃO TEXTO PLANO
                dataExpiracao,
                status: true
            }
        });

        await enviarEmailToken(email, 'boas-vindas', 'boas-vindas');

        const token = gerarJWT(empresa);

        console.log(`✅ Empresa cadastrada: ${nomeEmpresa}`);
        res.json({
            sucesso: true,
            mensagem: 'Empresa cadastrada com sucesso!',
            token,
            empresaId: empresa.id,
            email: empresa.email
        });
    } catch (error) {
        console.error('❌ Erro cadastro:', error);
        res.status(500).json({ erro: 'Erro ao cadastrar empresa' });
    }
});

// ========== POST /auth/solicitar-token-senha ==========
router.post('/solicitar-token-senha', async (req, res) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({ erro: 'E-mail obrigatório' });
        }

        const empresa = await prisma.empresa.findFirst({
            where: { email: email.toLowerCase() }
        });

        if (!empresa) {
            return res.status(404).json({ erro: 'E-mail não encontrado' });
        }

        const token = gerarToken();
        const tokenExpiracao = new Date(Date.now() + 15 * 60 * 1000);

        await prisma.empresa.update({
            where: { id: empresa.id },
            data: {
                resetPasswordToken: token,
                resetPasswordExpires: tokenExpiracao
            }
        });

        const emailEnviado = await enviarEmailToken(email, token, 'recuperacao');
        if (!emailEnviado) {
            console.log(`📌 Token para teste: ${token}`);
        }

        console.log(`📧 Token enviado para: ${email}`);
        res.json({
            sucesso: true,
            mensagem: 'Código enviado para seu e-mail',
            email
        });
    } catch (error) {
        console.error('❌ Erro solicitar token:', error);
        res.status(500).json({ erro: 'Erro ao solicitar token' });
    }
});

// ========== POST /auth/verificar-token-senha ==========
router.post('/verificar-token-senha', async (req, res) => {
    try {
        const { email, token } = req.body;

        if (!email || !token) {
            return res.status(400).json({ erro: 'E-mail e token obrigatórios' });
        }

        const empresa = await prisma.empresa.findFirst({
            where: { email: email.toLowerCase() }
        });

        if (!empresa) {
            return res.status(404).json({ erro: 'E-mail não encontrado' });
        }

        if (empresa.resetPasswordToken !== token) {
            return res.status(401).json({ erro: 'Token inválido' });
        }

        if (!empresa.resetPasswordExpires || new Date() > new Date(empresa.resetPasswordExpires)) {
            return res.status(401).json({ erro: 'Token expirado' });
        }

        console.log(`✅ Token verificado: ${email}`);
        res.json({
            sucesso: true,
            mensagem: 'Token válido'
        });
    } catch (error) {
        console.error('❌ Erro verificar token:', error);
        res.status(500).json({ erro: 'Erro ao verificar token' });
    }
});

// ========== POST /auth/atualizar-senha-esquecida ==========
router.post('/atualizar-senha-esquecida', async (req, res) => {
    try {
        const { email, token, novaSenha } = req.body;

        if (!email || !token || !novaSenha) {
            return res.status(400).json({ erro: 'Preencha todos os campos' });
        }

        if (!validarSenhaForte(novaSenha)) {
            return res.status(400).json({ 
                erro: 'Senha fraca. Requisitos: maiúscula, minúscula, número, caractere especial, mín. 8 caracteres' 
            });
        }

        const empresa = await prisma.empresa.findFirst({
            where: { email: email.toLowerCase() }
        });

        if (!empresa) {
            return res.status(404).json({ erro: 'E-mail não encontrado' });
        }

        if (empresa.resetPasswordToken !== token) {
            return res.status(401).json({ erro: 'Token inválido' });
        }

        if (!empresa.resetPasswordExpires || new Date() > new Date(empresa.resetPasswordExpires)) {
            return res.status(401).json({ erro: 'Token expirado' });
        }

        // ✅ CRIPTOGRAFAR NOVA SENHA
        const senhaHash = await criptografarSenha(novaSenha);

        await prisma.empresa.update({
            where: { id: empresa.id },
            data: {
                senha: senhaHash, // ✅ SALVAR HASH
                resetPasswordToken: null,
                resetPasswordExpires: null
            }
        });

        console.log(`✅ Senha atualizada: ${email}`);
        res.json({
            sucesso: true,
            mensagem: 'Senha atualizada com sucesso!'
        });
    } catch (error) {
        console.error('❌ Erro atualizar senha:', error);
        res.status(500).json({ erro: 'Erro ao atualizar senha' });
    }
});

module.exports = router;