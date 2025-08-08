@Injectable({ scope: Scope.REQUEST })
export class CatsService {
  private catRepository: Repository<Cat>;

  constructor(
    @Inject(REQUEST) private readonly request: Request,
    @Inject(CONNECTION) private readonly connection: DataSource
  ) {
    this.catRepository = connection.getRepository(Cat);
  }

  async createCat(catDto: CreateCatDto): Promise<Cat> {
    const cat = new Cat();
    cat.name = catDto.name;
    return this.catRepository.save(cat);
  }

  async getAllCats(): Promise<Cat[]> {
    return this.catRepository.find();
  }
}