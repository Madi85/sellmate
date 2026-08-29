import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ArticleCreate } from './article-create';

describe('ArticleCreate', () => {
  let component: ArticleCreate;
  let fixture: ComponentFixture<ArticleCreate>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ArticleCreate],
    }).compileComponents();

    fixture = TestBed.createComponent(ArticleCreate);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
