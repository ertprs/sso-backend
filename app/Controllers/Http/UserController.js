// @ts-nocheck
'use strict'

const User = use('App/Models/User')
const { validateAll } = use('Validator');
const Database = use('Database')
const Helpers = use('Helpers');

const erroMessages = {
  'username.required': 'O nome de usuário é obrigatório!',
  'email.required': 'O e-mail é obrigatório!',
  'password.required': 'A senha é obrigatória!',
  'username.unique': 'Este nome de usuário já existe!',
  'email.unique': 'Este e-mail já foi cadastrado!',
  'email.email': 'Este e-mail não é válido!',
  'username.min': 'O nome de usuário deve conter no mínimo 5 caracteres!',
  'password.min': 'A senha deve conter no mínimo 8 caracteres!',
}


class UserController {
  async create({ request, response }) {
    try{
      const validation = await validateAll(request.all(), {
        username: 'required|min:5|unique:users',
        email: 'required|email|unique:users',
        password: 'required|min:8'
      }, erroMessages);

      const file = request.file('file', {
        types: ['image'],
        size: '1mb',
        extnames: ['png', 'jpg', 'jpeg']
      })

      if(!validation.fails()) {
        await file.moveAll(Helpers.tmpPath('avatar_user'), item => ({
          name: `${Date.now()}-${item.clientName}`
        }))

        if(file.movedAll()) {
          const data = request.only(['username', 'email', 'password']);
          await Promise.all(
            file.movedList().map(item => {
              data.path_image = item.fileName
            })
          )
          const user = await User.create(data);
          return user;
        } else {
          console.log(file.errors())
          return file.errors();
        }
      } else {
        console.log(validation.messages())
        return response.status(203).send({ message: validation.messages() });
      }
    } catch (e) {
      console.log(e)
      return response.status(500).send({ message: 'Falha ao inserir o registro.', error: e });
    }
  }

  async login({ request, response, auth }) {
    try{
        const { email, password } = request.all();
        if(!email || !password) {
          return response.status(403).send({ message: 'Todos os campos devem ser preenchidos!' })
        }
        const data = await Database.select('email', 'approved').from('users').where('email', email).first();
        if(data) {
          if(data.approved) {
            const validToken = await auth.attempt(email, password);
            return validToken;
          } else {
            return response.status(403).send({ message: 'Acesso negado!' })
          }
        } else {
          return response.status(404).send({ message: 'Este usuário não existe!' })
        }

    } catch(err) {
      console.log(err)
      if(err && err.passwordField === 'password') {
        return response.status(403).send({
          message: 'Sua senha está incorreta!'
        })
      }
      return response.status(500).send({
        message: 'Ocorreu um erro inesperado...',
        error: err
      });
    }
  }

  async index({ request, response, auth }) {
    try {
      const { id } = auth.user;
      const userAdmin = await Database.select('admin').from('users').where('id', id).first();
      if(userAdmin && userAdmin.admin) {
        const data = await Database.select('id', 'username', 'email', 'path_image', 'approved', 'admin').from('users');
        return data;
      } else {
        return response.status(203).send({ message: 'Acesso negado!' });
      }
    } catch(err) {
      console.log(err)
      return response.status(500).send({
        message: 'Falha ao listar os usuários!',
        error: err
      });
    }
  }

  async indexNoAdmin({ request, response, auth }) {
    try {
      const { id } = auth.user;
      const userAdmin = await Database.select('admin').from('users').where('id', id).first();
      if(userAdmin && userAdmin.admin) {
        const data = await Database.select('id', 'username', 'email', 'path_image', 'approved', 'admin').from('users').where('admin', false);
        return data;
      } else {
        return response.status(203).send({ message: 'Acesso negado!' });
      }
    } catch(err) {
      console.log(err)
      return response.status(500).send({
        message: 'Falha ao listar os usuários!',
        error: err
      });
    }
  }

  async indexAdmin({ request, response, auth }) {
    try {
      const { id } = auth.user;
      const userAdmin = await Database.select('admin').from('users').where('id', id).first();
      if(userAdmin && userAdmin.admin) {
        const data = await Database.select('id', 'username', 'email', 'path_image', 'approved', 'admin').from('users').where('admin', true);
        return data;
      } else {
        return response.status(203).send({ message: 'Acesso negado!' });
      }
    } catch(err) {
      console.log(err)
      return response.status(500).send({
        message: 'Falha ao listar os usuários!',
        error: err
      });
    }
  }

  async approvedUser({ request, response, auth }) {
    try{
      const { id } = auth.user;
      const userAdmin = await User.query().where('id', id).first();
      const { email_user, approved } = request.all();
      if(!email_user) return response.status(400).send({ message: 'O e-mail do usuário é obrigatório!' });
      if(userAdmin && userAdmin.admin) {
        const data = await User.query().where('email', email_user).first();
        if(data) {
          data.approved = approved;
          await data.save()
          return data;
        } else {
          return response.status(204).send({ message: 'Este usuário não existe!' });
        }
      } else {
        return response.status(203).send({ message: 'Você não pode aprovar este usuário!' });
      }
    } catch (e) {
      console.log(e)
      return response.status(500).send({ message: 'Falha ao aprovar usuário!', error: e });
    }
  }

  async approvedAdmin({ request, response, auth }) {
    try{
      const { id } = auth.user;
      const userAdmin = await User.query().where('id', id).first();
      const { email_user, admin } = request.all();
      if(!email_user) return response.status(400).send({ message: 'O e-mail do usuário é obrigatório!' });
      if(userAdmin && userAdmin.admin) {
        const data = await User.query().where('email', email_user).first();
        if(data) {
          if(data.approved) {
            data.admin = admin;
            await data.save()
            return data;
          } else {
            return response.status(203).send({ message: 'Este usuário ainda não foi aprovado!' })
          }
        } else {
          return response.status(204).send({ message: 'Este usuário não existe!' })
        }
      } else {
        return response.status(203).send({ message: 'Você não pode aprovar este usuário!' });
      }
    } catch (e) {
      console.log(e)
      return response.status(500).send({ message: 'Falha ao aprovar usuário!', error: e });
    }
  }

  async showUser({ params, request, response, auth }) {
    try {
      const { id } = auth.user;
      const userAdmin = await User.query().where('id', id).first();
      if(userAdmin && userAdmin.admin) {
        const user = await User.query().where('id', params.id).first();
        if(!user) return response.status(204).send({ message: 'Nenhum registro encontrado!' });
        return user;
      } else {
        return response.status(203).send({ message: 'Acesso negado!' });
      }
    } catch(err) {
      console.log(err)
      return response.status(500).send({ message: 'Falha ao buscar este usuário!', error: err });
    }
  }

  async updateUser({ params, request, response, auth }) {
    try{      
      const data = request.only(['username', 'email', 'password']);
      const validation = await validateAll(request.all(), {
        username: 'required|min:5',
        email: 'required|email',
        password: 'required|min:8'
      }, erroMessages);

      if(!validation.fails()) {
        const file = request.file('file', {
          types: ['image'],
          size: '1mb',
          extnames: ['png', 'jpg', 'jpeg']
        })
        
        if(file) {
          await file.moveAll(Helpers.tmpPath('avatar_user'), item => ({
            name: `${Date.now()}-${item.clientName}`
          }))

          if(file.movedAll()) {
            await Promise.all(
              file.movedList().map(item => {
                data.path_image = item.fileName
              })
            )
          } else {
            console.log(file.errors())
            return file.errors()
          }
        }

        const { id } = auth.user;
        const userAuth = await User.query().where('id', id).first();
        const user = await User.query().where('id', params.id).first();

        if(user) {
          if(user.id === userAuth.id || userAuth.admin) {
            if(user.username !== data.username) user.username = data.username;
            if(user.email !== data.email) user.email = data.email;
            if(user.password !== data.password) user.password = data.password;
            if(user.path_image !== data.path_image) user.path_image = data.path_image;

            await user.save();
            return user;
          } else {
            return response.status(203).send({
              message: 'Falha ao alterar os dados do usuário!',
              errors: [
                'Você não é um administrador!',
                'Você não pode alterar os dados de outro usuário!',
              ]
            });
          }
        } else {
          return response.status(204).send({ message: 'Este usuário não existe!' });
        }
      } else {
        console.log(validation.messages())
        return response.status(203).send({ message: validation.messages() });
      }
    } catch (e) {
      console.log(e)
      return response.status(500).send({ message: 'Falha ao inserir o registro.', error: e });
    }
  }

  async destroy({ params, request, response, auth }) {
    try {
      const { id } = auth.user;
      const userAdmin = await User.query().where('id', id).first();
      if(userAdmin && userAdmin.admin) {
        const user = await User.query().where('id', params.id).first();
        if(!user) return response.status(204).send({ message: 'Nenhum registro encontrado!' });
        await user.delete()
        return response.status(200).send({ message: 'Registro excluído com sucesso!' });
      } else {
        return response.status(203).send({ message: 'Acesso negado!' });
      }
    } catch(err) {
      console.log(err)
      return response.status(500).send({ message: 'Falha ao buscar este usuário!', error: err });
    }
  }

}

module.exports = UserController